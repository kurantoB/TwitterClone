import express, { NextFunction, Request, Response } from "express"
import passport from './auth'
import session from "express-session"

const app = express()
const port = 8080

app.use(express.json())

function isLoggedIn(req: Request, res: Response, next: NextFunction) {
    req.user ? next() : res.sendStatus(401) // unauthorized
}

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}))
app.use(passport.initialize())
app.use(passport.session())

app.get('/', (req, res) => {
    res.send("Welcome")
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

app.get('/auth/protected', isLoggedIn, (req, res) => {
    const name = req.user.displayName
    res.send(`Hello ${name}, your id is ${req.user.id}`)
})

/* eslint-disable */
app.use('/auth/logout', (req, res) => {
    req.session.destroy(_ => {})
    res.send("See you again!")
})
/* eslint-enable */

app.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`server started at http://localhost:${ port}`)
})