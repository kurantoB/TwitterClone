import passport from 'passport'
import { Strategy as GoogleStrategy, VerifyCallback } from 'passport-google-oauth2'
import dotenv from 'dotenv'
import { Request } from 'express'

dotenv.config()

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:8080/auth/google/callback",
    passReqToCallback: true
}, function (request: Request, accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) {
    // User.findOrCreate({ googleId: profile.id }, function (err, user) {
    //     return done(err, user);
    // });
    done(null, profile)
}
))

passport.serializeUser((user, done) => {
    done(null, user)
})

passport.deserializeUser((user: Express.User, done) => {
    done(null, user)
})

export default passport