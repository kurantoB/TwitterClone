import express from "express"
import passport, { ensureAuthenticated } from './auth'
import session from "express-session"
import https from 'https'
import fs from 'fs'
import { initialize as initializePersistence } from "./persistence"
// import testDB from "./dbtest"

initializePersistence().then(async () => {
    // await testDB()
    startServer()
})

function startServer() {
    const app = express()
    const port = 8080

    app.use(express.json())

    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: true }
    }))
    app.use(passport.initialize())
    app.use(passport.session())

    app.get('/', (req, res) => {
        res.send('Welcome.')
    })

    app.get('/auth/google',
        passport.authenticate('google', {
            scope: ['profile']
        })
    )

    app.get('/auth/google/callback', passport.authenticate('google', {
        successRedirect: '/auth/protected',
        failureRedirect: '/auth/google/failure'
    }))

    app.get('/auth/google/failure', (req, res) => {
        res.send("Something went wrong!")
    })

    app.get('/auth/protected', ensureAuthenticated, (req, res) => {
        const name = req.user.displayName
        res.send(`Hello ${name}, your id is ${req.user.id} of type ${typeof req.user.id}`)
    })

    /* eslint-disable */
    app.use('/auth/logout', (req, res) => {
        req.session.destroy(_ => { })
        res.send("See you again!")
    })
    /* eslint-enable */

    https.createServer(
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
        })
}