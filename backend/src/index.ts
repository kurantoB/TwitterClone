import express from "express"
import https from 'https'
import fs from 'fs'
import { initialize as initializePersistence } from "./persistence"
import { accountExists, createOrUpdateAccount, deleteUser } from "./accountAPI"
import getUserId from "./userGetter"
import formidable from "formidable"
import consts from "./consts"
import path from "path"
import { OAuth2Client } from "google-auth-library"
// import testDB from "./dbtest"

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
        userValidationError: true,
        errMsg: errMsg
    })
}

function startServer() {
    const app = express()
    const port = 8080

    app.use(express.json())

    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (err.name === "UnauthorizedError") {
            res.status(401).json({
                userValidationError: true,
                errMsg: err.message
            })
        }
    })

    // { userExists: boolean } or error code 500
    app.get('/auth/checkuser', verifyToken, async (req, res) => {
        await wrapAPICall(500, req, res, async (req, errorPush, callback) => {
            const googleid = req.user.sub
            let hasUser: boolean = false
            try {
                hasUser = await accountExists(googleid)
            } catch (error) {
                errorPush(error)
                callback(null)
                return
            }
            if (hasUser) {
                callback({ userExists: true })
            } else {
                callback({ userExists: false })
            }
        })
    })

    // { actionSuccess: boolean } or error code 500
    app.post('/api/create-account', verifyToken, async (req, res) => {
        await wrapAPICall(500, req, res, async (req, errorPush, callback) => {
            const googleid = req.user.sub
            let hasUser: boolean = false
            try {
                hasUser = await accountExists(googleid)
                if (hasUser) {
                    throw new Error("An account already exists for this Google ID.")
                }
            } catch (error) {
                errorPush(error)
                callback({ actionSuccess: false })
                return
            }
            handleCreateOrUpdateAccount(req, errorPush, callback, null)
        })
    })

    // { actionSuccess: boolean } or error code 500
    app.patch('/api/update-account', verifyToken, async (req, res) => {
        await wrapAPICall(500, req, res, async (req, errorPush, callback) => {
            const userId = await validateUserId(req, res)
            if (!userId) {
                return
            }
            handleCreateOrUpdateAccount(req, errorPush, callback, userId)
        })
    })

    // { actionSuccess: boolean } or error code 500
    app.delete('/api/delete-account', verifyToken, async (req, res) => {
        await wrapAPICall(500, req, res, async (req, errorPush, callback) => {
            const userId = await validateUserId(req, res)
            if (!userId) {
                return
            }

            await deleteUser(userId, errorPush, (success: boolean) => {
                callback({ actionSuccess: success })
            })
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
    res: express.Response
) {
    try {
        const userId = await getUserId(req.user.sub)
        return userId
    } catch (error) {
        res.status(401).json({
            userValidationError: true,
            errMsg: error
        })
        return null
    }
}

async function wrapAPICall(
    errStatusCode: number,
    req: express.Request,
    res: express.Response,
    apiCall: (
        req: express.Request,
        errorPush: (error: Error) => void,
        callback: (responseVal: any) => void
    ) => Promise<any>
) {
    const errors: Error[] = []
    await apiCall(req, (error) => {
        errors.push(error)
    }, (responseVal: any) => {
        if (errors.length > 0) {
            res.status(errStatusCode).json({
                body: responseVal,
                errors: errors.map((error) => error.message)
            })
        } else {
            res.status(200).json({ body: responseVal })
        }
    })
}

function handleCreateOrUpdateAccount(
    req: express.Request,
    errorPush: (error: Error) => void,
    callback: (responseVal: any) => void,
    userId: string, // is null if this is account creation
) {
    const form = formidable({ multiples: false })
    form.parse(req, async (
        err,
        fields: Formidable.AccountFields,
        files: Formidable.AccountFiles
    ) => {
        if (err) {
            errorPush(new Error(`Failed to read account creation request: ${err.message}`))
            callback({ actionSuccess: false })
            return
        }
        let hasFormError = false
        if (fields.username[0].length == 0 || fields.username[0].length > consts.MAX_USERNAME_LENGTH) {
            errorPush(new Error(`username/User name must be between 1 and ${consts.MAX_USERNAME_LENGTH} characters.`))
            hasFormError = true
        }
        if (fields.bio[0].length > consts.MAX_BIO_LENGTH) {
            errorPush(new Error(`bio/Bio must not exceed ${consts.MAX_BIO_LENGTH} characters.`))
            hasFormError = true
        }

        if (!(files.avatar) || files.avatar[0].size === 0) {
            files.avatar = null
        }
        if (
            files.avatar
            && path.extname(files.avatar[0].originalFilename) !== ".png"
            && path.extname(files.avatar[0].originalFilename) !== ".jpg"
            && path.extname(files.avatar[0].originalFilename) !== ".jpeg"
        ) {
            errorPush(new Error(`avatar/Avatar file must be in PNG or JPEG format.`))
            hasFormError = true
        }
        if (files.avatar && files.avatar[0].size > consts.MAX_AVATAR_FILESIZE_BYTES) {
            errorPush(new Error(`avatar/Avatar file size must not exceed ${Math.floor(consts.MAX_BIO_LENGTH / 1024)} KB.`))
            hasFormError = true
        }

        if (hasFormError) {
            callback({ actionSuccess: false })
            return
        }

        await createOrUpdateAccount(
            userId,
            req.user.sub,
            fields.username[0],
            fields.bio[0],
            files.avatar ? files.avatar[0].filepath : null,
            userId === null ? false : (fields.isDeleteAvatar ? true : false),
            errorPush,
            (success: boolean) => {
                callback({ actionSuccess: success })
            }
        )
    })
}