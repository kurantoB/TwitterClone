import express from "express"
import https from 'https'
import fs from 'fs'
import { blockUser, follow, followHook, getBlocklist, getFollowRelationship, initialize as initializePersistence, isBlockedBy, isBlocking, unblockUser, unfollow } from "./persistence"
import { getAllFollowers, getAllFollowing, getAllMutuals, getCommonFollowing, getSpecificFollowers, getSpecificFollowing } from "./api/followInfoAPI"
import { getCommonFollowers } from "./api/followInfoAPI"
import { getUnacquaintedMutuals } from "./api/followInfoAPI"
import { getMutualsYouFollow } from "./api/followInfoAPI"
import { getMutualsFollowingYou } from "./api/followInfoAPI"
import { getSharedMutuals } from "./api/followInfoAPI"
import { createOrUpdateAccount, deleteUser, getUserByUsername } from "./api/accountAPI"
import formidable, { Files } from "formidable"
import consts from "./consts"
import { LoginTicket, OAuth2Client, TokenPayload } from "google-auth-library"
import { configDotenv } from "dotenv"
import cors from 'cors'
import { getUserHasAvatar } from "./api/generalAPI"
import testDB, { clearDB, testDB2 } from "./dbtest"
import { getUserIdFromToken, getUsernameFromToken } from "./userGetter"
import { ImageAnnotatorClient } from "@google-cloud/vision"

/*
Responses will be in the format { body }
Requests that fail will be in the format { error }
 */

export const SAFE_SEARCH_CLIENT = new ImageAnnotatorClient({ keyFilename: "twitterclone-399423-d7e866f866ec.json" })

configDotenv()

initializePersistence().then(async () => {
    // await testDB2()
    // await testDB()
    startServer()
})

// Middleware to verify JWT tokens
async function verifyToken(req: express.Request, res: express.Response, next: express.NextFunction) {
    verifyTokenHelper(
        req.headers.authorization,
        async () => {
            res.sendStatus(401)
        },
        async (token) => {
            req.user = token
            next()
        },
        (error) => {
            res.sendStatus(401)
        }
    )
}

async function verifyTokenHelper(
    authorizationHeader: string,
    noTokenCallback: () => Promise<void>,
    tokenCallback: (tokenPayload: TokenPayload) => Promise<void>,
    verifyError: (error: Error) => void
): Promise<void> {
    if (authorizationHeader) {
        const token = authorizationHeader.split(' ')[1]
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
        let ticket: LoginTicket
        try {
            ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID
            })
        } catch (error) {
            verifyError(error)
        }
        await tokenCallback(ticket.getPayload())
    } else {
        await noTokenCallback()
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

    app.get('/has-avatar', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const hasAvatar = await getUserHasAvatar(req.user.sub)
            callback({ hasAvatar })
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
            const userBeingViewed = await getUserByUsername(req.params.username)
            if (!userBeingViewed) {
                throw new Error("User not found.")
            }
            await verifyTokenHelper(
                req.headers.authorization,
                async () => {
                    return callback({
                        user: userBeingViewed,
                        viewingOwn: false
                    })
                },
                async (token) => {
                    const viewingOwn = userBeingViewed.googleid === token.sub
                    callback({
                        user: userBeingViewed,
                        viewingOwn
                    })
                },
                (error) => {
                    res.sendStatus(401)
                }
            )
        })
    })

    app.get('/is-blocked/:targetuserid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const isBlockingVal = await isBlocking(req.user.sub, req.params.targetuserid)
            callback({ isBlocking: isBlockingVal })
        })
    })

    app.get('/is-blocked-by/:targetuserid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const isBlockedByVal = await isBlockedBy(req.user.sub, req.params.targetuserid)
            callback({ isBlockedBy: isBlockedByVal })
        })
    })

    app.patch('/block/:targetuserid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            await blockUser(req.user.sub, req.params.targetuserid)
            callback("OK")
        })
    })

    app.patch('/unblock/:targetuserid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            await unblockUser(req.user.sub, req.params.targetuserid)
            callback("OK")
        })
    })

    app.get('/get-blocklist', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const blockedUsernames = await getBlocklist(req.user.sub)
            callback({ blockedUsernames })
        })
    })

    app.get('/get-following-relationship/:targetusername', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const { following, followedBy } = await getFollowRelationship(req.user.sub, req.params.targetusername)
            callback({ following, followedBy })
        })
    })

    app.patch('/follow/:targetuserid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            await follow(req.user.sub, req.params.targetuserid)
            callback("OK")
            await followHook(req.user.sub, req.params.targetuserid, true)
        })
    })

    app.patch('/unfollow/:targetuserid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            await unfollow(req.user.sub, req.params.targetuserid)
            callback("OK")
            await followHook(req.user.sub, req.params.targetuserid, false)
        })
    })

    app.get('/shared-mutuals/:targetuserid/:batchnum', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = await getUserIdFromToken(req.user.sub)
            const convertedBatchNum = parseInt(req.params.batchnum)
            const amount = consts.HANDLE_BATCH_SIZE
            const offset = convertedBatchNum * amount
            const usernames = await getSharedMutuals(userId, req.params.targetuserid, offset, amount)
            callback({ usernames })
        })
    })

    app.get('/mutuals-following-you/:targetuserid/:batchnum', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = await getUserIdFromToken(req.user.sub)
            const convertedBatchNum = parseInt(req.params.batchnum)
            const amount = consts.HANDLE_BATCH_SIZE
            const offset = convertedBatchNum * amount
            const usernames = await getMutualsFollowingYou(userId, req.params.targetuserid, offset, amount)
            callback({ usernames })
        })
    })

    app.get('/mutuals-you-follow/:targetuserid/:batchnum', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = await getUserIdFromToken(req.user.sub)
            const convertedBatchNum = parseInt(req.params.batchnum)
            const amount = consts.HANDLE_BATCH_SIZE
            const offset = convertedBatchNum * amount
            const usernames = await getMutualsYouFollow(userId, req.params.targetuserid, offset, amount)
            callback({ usernames })
        })
    })

    app.get('/unacquainted-mutuals/:targetuserid/:batchnum', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = await getUserIdFromToken(req.user.sub)
            const convertedBatchNum = parseInt(req.params.batchnum)
            const amount = consts.HANDLE_BATCH_SIZE
            const offset = convertedBatchNum * amount
            const usernames = await getUnacquaintedMutuals(userId, req.params.targetuserid, offset, amount)
            callback({ usernames })
        })
    })

    app.get('/common-followers/:targetuserid/:batchnum', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = await getUserIdFromToken(req.user.sub)
            const convertedBatchNum = parseInt(req.params.batchnum)
            const amount = consts.HANDLE_BATCH_SIZE
            const offset = convertedBatchNum * amount
            const usernames = await getCommonFollowers(userId, req.params.targetuserid, offset, amount)
            callback({ usernames })
        })
    })

    app.get('/specific-followers/:targetuserid/:batchnum', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = await getUserIdFromToken(req.user.sub)
            const convertedBatchNum = parseInt(req.params.batchnum)
            const amount = consts.HANDLE_BATCH_SIZE
            const offset = convertedBatchNum * amount
            const usernames = await getSpecificFollowers(userId, req.params.targetuserid, offset, amount)
            callback({ usernames })
        })
    })

    app.get('/common-following/:targetuserid/:batchnum', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = await getUserIdFromToken(req.user.sub)
            const convertedBatchNum = parseInt(req.params.batchnum)
            const amount = consts.HANDLE_BATCH_SIZE
            const offset = convertedBatchNum * amount
            const usernames = await getCommonFollowing(userId, req.params.targetuserid, offset, amount)
            callback({ usernames })
        })
    })

    app.get('/specific-following/:targetuserid/:batchnum', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = await getUserIdFromToken(req.user.sub)
            const convertedBatchNum = parseInt(req.params.batchnum)
            const amount = consts.HANDLE_BATCH_SIZE
            const offset = convertedBatchNum * amount
            const usernames = await getSpecificFollowing(userId, req.params.targetuserid, offset, amount)
            callback({ usernames })
        })
    })

    app.get('/all-mutuals/:batchnum', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = await getUserIdFromToken(req.user.sub)
            const convertedBatchNum = parseInt(req.params.batchnum)
            const amount = consts.HANDLE_BATCH_SIZE
            const offset = convertedBatchNum * amount
            const usernames = await getAllMutuals(userId, offset, amount)
            callback({ usernames })
        })
    })

    app.get('/all-followers/:batchnum', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = await getUserIdFromToken(req.user.sub)
            const convertedBatchNum = parseInt(req.params.batchnum)
            const amount = consts.HANDLE_BATCH_SIZE
            const offset = convertedBatchNum * amount
            const usernames = await getAllFollowers(userId, offset, amount)
            callback({ usernames })
        })
    })

    app.get('/all-following/:batchnum', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = await getUserIdFromToken(req.user.sub)
            const convertedBatchNum = parseInt(req.params.batchnum)
            const amount = consts.HANDLE_BATCH_SIZE
            const offset = convertedBatchNum * amount
            const usernames = await getAllFollowing(userId, offset, amount)
            callback({ usernames })
        })
    })

    app.post('/create-account', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const googleid = req.user.sub
            if (await getUserIdFromToken(googleid)) {
                throw new Error("An account already exists for this Google ID.")
            }
            handleCreateOrUpdateAccount(req, callback, null)
        })
    })

    app.patch('/update-account', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            handleCreateOrUpdateAccount(req, callback, await getUserIdFromToken(req.user.sub))
        })
    })

    app.delete('/delete-account', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            await deleteUser(req.user.sub, callback)
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
            throw new Error(`Failed to read account creation or update request: ${err.message}`)
        }
        const formErrors: string[] = []
        if (!userId) {
            if (fields.username[0].length == 0 || fields.username[0].length > consts.MAX_USERNAME_LENGTH) {
                formErrors.push(`username/Handle must be between 1 and ${consts.MAX_USERNAME_LENGTH} characters.`)
            } else if (!/^[a-zA-Z0-9_]*$/.test(fields.username[0])) {
                formErrors.push("Only letters, numbers, and underscores are permitted in the handle.")
            }
        }
        if (fields.bio[0].length > consts.MAX_BIO_LENGTH) {
            formErrors.push(`bio/Bio must not exceed ${consts.MAX_BIO_LENGTH} characters.`)
        }
        if (fields.shortBio[0].length > consts.MAX_SHORT_BIO_LENGTH) {
            formErrors.push(`shortBio/Caption must not exceed ${consts.MAX_SHORT_BIO_LENGTH} characters.`)
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
                !userId ? fields.username[0] : null,
                fields.bio[0],
                fields.shortBio[0],
                uploadedFile ? uploadedFile.filepath : null,
                !userId ? false : (fields.isDeleteAvatar ? true : false),
                callback
            )
        } catch (error) {
            if (error.message && error.message.indexOf("/") !== -1) {
                callback({ formErrors: [error.message] })
            } else {
                throw error
            }
        }
    })
}