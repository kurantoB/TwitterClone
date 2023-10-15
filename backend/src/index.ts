import express from "express"
import https from 'https'
import fs from 'fs'
import { getFollowRelationship, initialize as initializePersistence } from "./persistence"
import { createOrUpdateAccount, deleteUser, getUserByUsername } from "./api/accountAPI"
import formidable, { Files } from "formidable"
import consts from "./consts"
import { OAuth2Client, TokenPayload } from "google-auth-library"
import { configDotenv } from "dotenv"
import cors from 'cors'
import { getUserHasAvatar } from "./api/generalAPI"
import testDB, { clearDB } from "./dbtest"
import { getUserIdFromToken, getUsernameFromToken } from "./userGetter"

/*
Responses will be in the format { body }
Requests that fail will be in the format { error }
 */

configDotenv()

initializePersistence().then(async () => {
    // await testDB()
    startServer()
})

// Middleware to verify JWT tokens
async function verifyToken(req: express.Request, res: express.Response, next: express.NextFunction) {
    verifyTokenHelper(req.headers.authorization, async () => {
        res.sendStatus(401)
    }).then((tokenPayload) => {
        req.user = tokenPayload
        next()
    }).catch((_) => {
        return res.sendStatus(401)
    })
}

async function verifyTokenHelper(authorizationHeader: string, noTokenCallback: () => Promise<void>): Promise<TokenPayload> {
    if (authorizationHeader) {
        const token = authorizationHeader.split(' ')[1]
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        })
        return ticket.getPayload()
    } else {
        await noTokenCallback()
        return null
    }
}

function startServer() {
    const app = express()
    const port = process.env.PORT

    app.use(cors())
    app.use(express.json())

    app.delete('/clear-db', async (req, res) => {
        await wrapAPICall(req, res, async (_, callback) => {
            await clearDB()
            callback("OK")
        })
    })

    app.get('/get-userid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = await getUserIdFromToken(req.user.sub)
            if (!userId) {
                throw new Error("User not found.")
            }
            callback({ userId })
        })
    })

    app.get('/get-username', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const username = await getUsernameFromToken(req.user.sub)
            if (!username) {
                throw new Error("User not found.")
            }
            callback({ username })
        })
    })

    app.get('/get-profile/:username', async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            await verifyTokenHelper(req.headers.authorization, async () => { })
                .then(async (tokenPayload) => {
                    const userBeingViewed = await getUserByUsername(req.params.username)
                    if (!userBeingViewed) {
                        throw new Error("User not found.")
                    }
                    if (!tokenPayload) {
                        return callback({
                            user: userBeingViewed,
                            viewingOwn: false
                        })
                    }
                    const viewingOwn = userBeingViewed.googleid === tokenPayload.sub
                    callback({
                        user: userBeingViewed,
                        viewingOwn
                    })
                })
        })
    })

    app.get('/get-following-relationship/:targetusername', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const { following, followedBy } = await getFollowRelationship(req.user.sub, req.params.targetusername)
            callback({ following, followedBy })
        })
    })

    app.post('/api/create-account', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const googleid = req.user.sub
            if (await getUserIdFromToken(googleid)) {
                throw new Error("An account already exists for this Google ID.")
            }
            handleCreateOrUpdateAccount(req, callback, null)
        })
    })

    app.patch('/api/update-account', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            handleCreateOrUpdateAccount(req, callback, await getUserIdFromToken(req.user.sub))
        })
    })

    app.delete('/api/delete-account', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            await deleteUser(await getUserIdFromToken(req.user.sub), callback)
        })
    })

    app.get('/has-avatar', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const hasAvatar = await getUserHasAvatar(req.user.sub)
            callback({ hasAvatar })
        })
    })

    app.listen(port, () => {
        console.log(`server started at http://localhost:${port}`)
    })

    /*https.createServer(
        // Provide the private and public key to the server by reading each
        // file's content with the readFileSync() method.
        {
            key: fs.readFileSync("key.pem"),
            cert: fs.readFileSync("cert.pem"),
        },
        app
    )
        .listen(port, () => {
            // tslint:disable-next-line:no-console
            console.log(`server started at https://localhost:${port}`)
        })*/
}

type StatusCodeContext = {
    code: number
}

// callback is only called upon success
async function wrapAPICall(
    req: express.Request,
    res: express.Response,
    apiCall: (
        req: express.Request,
        callback: (responseVal: any) => void
    ) => Promise<void>
) {
    try {
        await apiCall(req, (responseVal: any) => {
            res.status(200).json({ body: responseVal })
        })
    } catch (error) {
        res.status(200).json({
            error: error.message
        })
    }
}

// returns { formErrors }
function handleCreateOrUpdateAccount(
    req: express.Request,
    callback: (responseVal: any) => void,
    userId: string, // is falsy if this is account creation
) {
    const form = formidable({ multiples: false })
    form.parse(req, async (
        err,
        fields: Formidable.AccountFields,
        files: Files
    ) => {
        if (err) {
            throw new Error(`Failed to read account creation request: ${err.message}`)
        }
        const formErrors: string[] = []
        if (fields.username[0].length == 0 || fields.username[0].length > consts.MAX_USERNAME_LENGTH) {
            formErrors.push(`username/Handle must be between 1 and ${consts.MAX_USERNAME_LENGTH} characters.`)
        } else if (!/^[a-zA-Z0-9_]*$/.test(fields.username[0])) {
            formErrors.push("Only letters, numbers, and underscores are permitted in the handle.")
        }
        if (fields.bio[0].length > consts.MAX_BIO_LENGTH) {
            formErrors.push(`bio/Bio must not exceed ${consts.MAX_BIO_LENGTH} characters.`)
        }
        if (fields.shortBio[0].length > consts.MAX_SHORT_BIO_LENGTH) {
            formErrors.push(`bio/Caption must not exceed ${consts.MAX_SHORT_BIO_LENGTH} characters.`)
        }

        if (files.file && files.file[0].size > 0) {
            const uploadedFile = files.file[0]
            if (uploadedFile.mimetype !== "image/png" && uploadedFile.mimetype !== "image/jpeg") {
                formErrors.push(`avatar/Avatar file must be in PNG or JPEG format.`)
            }
            if (uploadedFile.size > consts.MAX_AVATAR_FILESIZE_BYTES) {
                formErrors.push(`avatar/Avatar file size must not exceed ${Math.floor(consts.MAX_AVATAR_FILESIZE_BYTES / 1024)} KB.`)
            }
        }

        if (formErrors.length > 0) {
            callback({ formErrors })
            return
        }

        const uploadedFile = files.file ? files.file[0] : null
        try {
            await createOrUpdateAccount(
                userId,
                req.user.sub,
                fields.username[0],
                fields.bio[0],
                fields.shortBio[0],
                uploadedFile ? uploadedFile.filepath : null,
                !userId ? false : (fields.isDeleteAvatar ? true : false),
                callback
            )
        } catch (error) {
            if (error.message && error.message.indexOf("username/") !== -1) {
                callback({ formErrors: [error.message] })
            } else {
                throw error
            }
        }
    })
}