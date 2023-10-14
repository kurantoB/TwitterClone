import express from "express"
import https from 'https'
import fs from 'fs'
import { initialize as initializePersistence } from "./persistence"
import { createOrUpdateAccount, deleteUser } from "./api/accountAPI"
import getUserId from "./userGetter"
import formidable, { Files } from "formidable"
import consts from "./consts"
import { OAuth2Client } from "google-auth-library"
import { configDotenv } from "dotenv"
import cors from 'cors'
import { getUserHasAvatar } from "./api/generalAPI"
import testDB, { clearDB } from "./dbtest"

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
    const authorizationHeader = req.headers.authorization
    let errMsg: string
    if (authorizationHeader) {
        const token = authorizationHeader.split(' ')[1]
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
        try {
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID
            })
            const payload = ticket.getPayload()
            req.user = payload
            return next()
        } catch (error) {
            errMsg = error.message
        }
    } else {
        errMsg = "Failed to get authorization token"
    }
    return res.status(401).json({
        error: errMsg
    })
}

function startServer() {
    const app = express()
    const port = process.env.PORT

    app.use(cors())
    app.use(express.json())

    app.delete('/clear-db', async (req, res) => {
        await wrapAPICall({ code: 500 }, req, res, async (_, callback) => {
            await clearDB()
            callback("OK")
        })
    })

    app.get('/auth/get-user', verifyToken, async (req, res) => {
        await wrapAPICall({ code: 500 }, req, res, async (req, callback) => {
            const googleid = req.user.sub
            let userId: string = null
            userId = await getUserId(googleid)
            callback({ userId })
        })
    })

    app.post('/api/create-account', verifyToken, async (req, res) => {
        await wrapAPICall({ code: 500 }, req, res, async (req, callback) => {
            const googleid = req.user.sub
            if (await getUserId(googleid)) {
                throw new Error("An account already exists for this Google ID.")
            }
            handleCreateOrUpdateAccount(req, callback, null)
        })
    })

    app.patch('/api/update-account', verifyToken, async (req, res) => {
        const errorCodeContext: StatusCodeContext = { code: 500 }
        await wrapAPICall(errorCodeContext, req, res, async (req, callback) => {
            const userId = await validateUserId(req, res, errorCodeContext)
            handleCreateOrUpdateAccount(req, callback, userId)
        })
    })

    app.delete('/api/delete-account', verifyToken, async (req, res) => {
        const errorCodeContext: StatusCodeContext = { code: 500 }
        await wrapAPICall(errorCodeContext, req, res, async (req, callback) => {
            const userId = await validateUserId(req, res, errorCodeContext)
            await deleteUser(userId, callback)
        })
    })

    app.get('/has-avatar', verifyToken, async (req, res) => {
        const errorCodeContext: StatusCodeContext = { code: 500 }
        await wrapAPICall(errorCodeContext, req, res, async (req, callback) => {
            const userId = await validateUserId(req, res, errorCodeContext)
            const hasAvatar = await getUserHasAvatar(userId)
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

async function validateUserId(
    req: express.Request,
    res: express.Response,
    errorCodeContext: StatusCodeContext
) {
    const userId = await getUserId(req.user.sub)
    if (!userId) {
        errorCodeContext.code = 401 // unauthorized
        throw new Error("Error - user validation failed.")
    }
    return userId
}

type StatusCodeContext = {
    code: number
}

// callback is only called upon success
async function wrapAPICall(
    errStatusCodeContext: StatusCodeContext,
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
        res.status(errStatusCodeContext.code).json({
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