import express from "express"
import https from 'https'
import fs from 'fs'
import { blockUser, clearDMsDEBUGONLY, clearHashtagsDEBUGONLY, deletePost, follow, followHook, friend, friendHook, getAllGoogleIDsForDeletionDEBUGONLY, getBlocklist, getFollowRelationship, getFriends, getIsPostVisible, getParentPostPromisesByMappingIds, getPostActivityFromUser, getPostByID, getPostMetadata, getUserByGoogleID, initialize as initializePersistence, isBlockedBy, isBlocking, likePost, postOrReply, postOrReplyHook, reportPost, repostPost, unblockUser, unfollow, unfriend, unlikePost, unrepostPost } from "./persistence"
import { getAllFollowers, getAllFollowing, getAllMutuals, getCommonFollowing, getSpecificFollowers, getSpecificFollowing } from "./utils/followInfo"
import { getCommonFollowers } from "./utils/followInfo"
import { getUnacquaintedMutuals } from "./utils/followInfo"
import { getMutualsYouFollow } from "./utils/followInfo"
import { getMutualsFollowingYou } from "./utils/followInfo"
import { getSharedMutuals } from "./utils/followInfo"
import { createOrUpdateAccount, deleteUserAccount, getUserByUsername } from "./utils/account"
import formidable, { Files } from "formidable"
import consts from "./consts"
import { OAuth2Client, TokenPayload } from "google-auth-library"
import { configDotenv } from "dotenv"
import cors from 'cors'
import { deleteMedia, getUserHasAvatar, safeSearchImage, storeMedia } from "./utils/general"
import testDB, { testDB2 } from "./dbtest"
import { getUserIdFromToken, getUsernameFromToken } from "./userGetter"
import { ImageAnnotatorClient } from "@google-cloud/vision"
import { VisibilityType } from "./entity/Post"
import { getHashtags } from "./utils/hashtag"

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
function verifyToken(req: express.Request, res: express.Response, next: express.NextFunction) {
    verifyTokenHelper(
        req.headers.authorization,
        // noTokenCallback
        () => {
            res.sendStatus(401)
        },
        // tokenPayloadCallback
        (tokenPayload) => {
            req.user = tokenPayload
            next()
        },
        // verifyError
        (_) => {
            res.sendStatus(401)
        }
    )
}

function verifyTokenHelper(
    authorizationHeader: string,
    noTokenCallback: () => void,
    tokenPayloadCallback: (tokenPayload: TokenPayload) => void,
    verifyError: (error: Error) => void
) {
    if (authorizationHeader) {
        const token = authorizationHeader.split(' ')[1]
        OAuth2ClientOperation(token, verifyError, tokenPayloadCallback)
    } else {
        noTokenCallback()
    }
}

function OAuth2ClientOperation(
    token: string,
    verifyError: (error: Error) => void,
    tokenPayloadCallback: (tokenPayload: TokenPayload) => void
) {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
    client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
    }, (err, login) => {
        if (err) {
            verifyError(err)
        } else if (login) {
            tokenPayloadCallback(login.getPayload())
        } else {
            verifyError(new Error("Failed to retrieve login ticket."))
        }
    })
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

    app.post('/check-session', async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            if (req.body && req.body.sessionToken) {
                const sessionToken = req.body.sessionToken
                OAuth2ClientOperation(
                    sessionToken,
                    // verifyError
                    (_) => {
                        res.sendStatus(401)
                    },
                    // tokenPayloadCallback
                    (_) => {
                        callback("OK")
                    }
                )
            } else {
                throw new Error("Session token not found.")
            }
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
            const { following, followedBy, friend } = await getFollowRelationship(req.user.sub, req.params.targetusername)
            callback({ following, followedBy, friend })
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

    app.patch('/friend/:targetuserid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            await friend(req.user.sub, req.params.targetuserid)
            callback("OK")
            await friendHook(req.user.sub, req.params.targetuserid, true)
        })
    })

    app.patch('/unfriend/:targetuserid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            await unfriend(req.user.sub, req.params.targetuserid)
            callback("OK")
        })
    })

    app.get('/get-friendlist', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const friendUsernames = await getFriends(req.user.sub)
            callback({ friendUsernames: friendUsernames })
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

    app.get('/all-mutuals/:batchnum/:username', async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const convertedBatchNum = parseInt(req.params.batchnum)
            const amount = consts.HANDLE_BATCH_SIZE
            const offset = convertedBatchNum * amount
            let userId
            if (req.user) {
                userId = await getUserIdFromToken(req.user.sub)
            } else {
                userId = (await getUserByUsername(req.params.username)).id
            }
            const usernames = await getAllMutuals(userId, offset, amount)
            callback({ usernames })
        })
    })

    app.get('/all-followers/:batchnum/:username', async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const convertedBatchNum = parseInt(req.params.batchnum)
            const amount = consts.HANDLE_BATCH_SIZE
            const offset = convertedBatchNum * amount
            let userId
            if (req.user) {
                userId = await getUserIdFromToken(req.user.sub)
            } else {
                userId = (await getUserByUsername(req.params.username)).id
            }
            const usernames = await getAllFollowers(userId, offset, amount)
            callback({ usernames })
        })
    })

    app.get('/all-following/:batchnum/:username', async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const convertedBatchNum = parseInt(req.params.batchnum)
            const amount = consts.HANDLE_BATCH_SIZE
            const offset = convertedBatchNum * amount
            let userId
            if (req.user) {
                userId = await getUserIdFromToken(req.user.sub)
            } else {
                userId = (await getUserByUsername(req.params.username)).id
            }
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
            await deleteUserAccount(req.user.sub, callback)
        })
    })

    app.post('/new-post', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const form = formidable({ multiples: false })
            form.parse(req, async (
                err,
                fields: Formidable.AccountFields,
                files: Files
            ) => {
                if (err) {
                    throw new Error(`Failed to read new post request: ${err.message}`)
                }
                const formErrors: string[] = []

                if (fields.message[0].length === 0) {
                    if (!files.file || files.file[0].size === 0) {
                        formErrors.push(`message/Post must have some text unless you attach an image.`)
                    }
                } else if (fields.message[0].length > consts.MAX_POST_LENGTH) {
                    formErrors.push(`message/Post must not exceed ${consts.MAX_POST_LENGTH} characters.`)
                }

                const hashtags = getHashtags(fields.message[0])

                if (files.file && files.file[0].size > 0) {
                    const uploadedFile = files.file[0]
                    if (uploadedFile.mimetype !== "image/png" && uploadedFile.mimetype !== "image/jpeg") {
                        formErrors.push(`media/Media file must be in PNG or JPEG format.`)
                    }
                    if (uploadedFile.size > consts.MAX_POST_MEDIA_BYTES) {
                        formErrors.push(`media/Media file size must not exceed ${Math.floor(consts.MAX_POST_MEDIA_BYTES / 1048576)} MB.`)
                    }
                    // perform safe search detection on the media file
                    if (!await safeSearchImage(uploadedFile.filepath)) {
                        formErrors.push(`media/Uploaded media file has been found to likely contain objectionable content. See: terms of service.`)
                    }
                }

                if (formErrors.length > 0) {
                    callback({ formErrors })
                    return
                }

                let visibility: VisibilityType
                switch (req.body.visibility) {
                    case "friends":
                        visibility = VisibilityType.FRIENDS
                        break
                    case "mutuals":
                        visibility = VisibilityType.MUTUALS
                        break
                    default:
                        visibility = VisibilityType.EVERYONE
                        break
                }

                let parentPosts: string[] = null
                if (req.body.parentPost1) {
                    parentPosts = [req.body.parentPost1]
                }
                if (req.body.parentPost2) {
                    parentPosts.push(req.body.parentPost2)
                }

                let vpgoogleid: string
                if (parentPosts.length > 0) {
                    vpgoogleid = (await getPostByID(parentPosts[0])).visibilityPerspective.googleid
                } else {
                    vpgoogleid = req.user.sub
                }

                const filePath = !!files.file && files.file[0].size > 0 ? files.file[0].filepath : null

                const newPost = await postOrReply(
                    req.user.sub,
                    fields.message[0],
                    !!filePath,
                    visibility,
                    vpgoogleid,
                    parentPosts,
                    hashtags
                )

                // send the response back to the client before doing post-save operations
                callback("OK")

                try {
                    if (filePath) {
                        const mediaPath = newPost.id + '_media'
                        await storeMedia(
                            consts.CLOUD_STORAGE_POSTMEDIA_BUCKETNAME,
                            filePath,
                            mediaPath
                        )
                    }
                    await postOrReplyHook(newPost, parentPosts)
                } catch (error) {
                    // TODO: report post-callback errors
                    console.log("/new-post endpoint post-callback error: " + error.message)
                }
            })
        })
    })

    app.post('/delete-post/:postid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const post = await getPostByID(req.params.postid)
            if (post.author.googleid !== req.user.sub) {
                throw new Error("Unauthorized delete post request")
            }
            if (post.media) {
                await deleteMedia(consts.CLOUD_STORAGE_POSTMEDIA_BUCKETNAME, post.id + "_media")
            }
            await deletePost(post)
            callback("OK")
        })
    })

    app.get('/get-post-public/:postid', async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const post = await getPostByID(req.params.postid)
            if (!post) {
                throw new Error("Unable to find post")
            }
            const visibility = post.visibility
            if (visibility !== VisibilityType.EVERYONE) {
                throw new Error("This post is restricted")
            }
            const [numReplies, numLikes, numReposts] = await getPostMetadata(post)
            callback({
                post: { ...post, numReplies, numLikes, numReposts }
            })
        })
    })

    app.get('/get-post-logged-in/:postid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const post = await getPostByID(req.params.postid)
            if (!post) {
                throw new Error("Unable to find post")
            }
            if (getIsPostVisible(req.user.sub, post)) {
                const [numReplies, numLikes, numReposts] = await getPostMetadata(post)
                const [liked, reposted] = await getPostActivityFromUser(req.user.sub, post)
                callback({
                    post: { ...post, numReplies, numLikes, numReposts, liked, reposted }
                })
            } else {
                throw new Error("This post is restricted")
            }
        })
    })

    app.get('/get-parent-posts-from-mappings/:mappingids', async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const mappingIds = req.params.mappingids.split(',')
            const posts = await getParentPostPromisesByMappingIds(mappingIds)
            callback({ posts })
        })
    })

    app.put('/report-post/:postid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const reporter = await getUserByGoogleID(req.user.sub)
            if (!reporter) {
                throw new Error("User not found")
            }
            const post = await getPostByID(req.params.postid)
            callback({ reportStatus: await reportPost(post, reporter) })
        })
    })

    app.put('/like-post/:postid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = (await getUserByGoogleID(req.user.sub)).id
            await likePost(userId, req.params.postid)
            callback({ success: true })
        })
    })

    app.put('/unlike-post/:postid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = (await getUserByGoogleID(req.user.sub)).id
            await unlikePost(userId, req.params.postid)
            callback({ success: true })
        })
    })

    app.put('/repost-post/:postid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = (await getUserByGoogleID(req.user.sub)).id
            await repostPost(userId, req.params.postid)
            callback({ success: true })
        })
    })

    app.put('/unrepost-post/:postid', verifyToken, async (req, res) => {
        await wrapAPICall(req, res, async (req, callback) => {
            const userId = (await getUserByGoogleID(req.user.sub)).id
            await unrepostPost(userId, req.params.postid)
            callback({ success: true })
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
            // username is only processed if this is an account creation
            if (fields.username[0].length < 4 || fields.username[0].length > consts.MAX_USERNAME_LENGTH) {
                formErrors.push(`username/Handle must be between 4 and ${consts.MAX_USERNAME_LENGTH} characters.`)
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
                !userId ? false : (fields.isDeleteAvatar[0] === "true" ? true : false),
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

export async function clearDB() {
    const googleids = await getAllGoogleIDsForDeletionDEBUGONLY()
    for (const googleid of googleids) {
        await deleteUserAccount(googleid, (_) => { })
    }

    await clearDMsDEBUGONLY()
    await clearHashtagsDEBUGONLY()
}