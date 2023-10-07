import { Link } from "react-router-dom"
import { useAppSelector, useAppDispatch } from "../app/hooks"
import { addErrorMessage, login, logout } from "../app/appState"
import { GoogleLogin } from '@react-oauth/google'
import connectSocket from "../app/socket"
import doAPICall from "../app/apiLayer"
import { useState } from "react"

export default function Header() {
    const dispatch = useAppDispatch()

    const isLoggedIn = useAppSelector((state) => state.tokenId ? true : false)
    const [userExists, setUserExists] = useState(false)

    const credentialResponse = (response: any) => {
        if (response && response.credential) {
            const accessToken = response.credential
            dispatch(login(accessToken))
            doAPICall('GET', '/auth/get-user', dispatch, accessToken, (body: any) => {
                if (body.userId) {
                    setUserExists(true)
                    // user account exists for this Google ID - connect to websocket service
                    connectSocket(body.userId, dispatch)
                }
            })
        }
    }

    const navigateToCreateAccount = () => {
        console.log("Navigate to Create Account")
        // navigate to Create Account
        dispatch(addErrorMessage("Create Account page isn't ready yet."))
    }

    return (
        <nav className="header">
            <Link to="/">
                <img src="./images/logo.png"></img>
            </Link>
            <div className="header--right-group">
                {isLoggedIn && !userExists && <button className="linkButton" onClick={navigateToCreateAccount}>Create Account</button>}
                <div>
                    {isLoggedIn ? <button className="linkButton" onClick={() => dispatch(logout())}>Logout</button> : <GoogleLogin
                        onSuccess={credentialResponse}
                        onError={() => {
                            dispatch(addErrorMessage("Error - unable to login."))
                        }}
                    />}
                </div>
            </div>
        </nav>
    )
}