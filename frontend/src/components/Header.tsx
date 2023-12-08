import { Link, useNavigate } from "react-router-dom"
import { useAppSelector, useAppDispatch } from "../app/hooks"
import { HeaderMode, addErrorMessage } from "../app/appState"
import { CredentialResponse, GoogleLogin } from '@react-oauth/google'
import connectSocket from "../app/socket"
import doAPICall from "../app/apiLayer"
import { logoutOfSite, loginWithAccessToken, checkPersistentLogin } from "../app/loginLayer"
import { useEffect } from "react"

export default function Header() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    const token = useAppSelector((state) => state.tokenId)
    const showLogin = useAppSelector((state) => state.showLogin)
    const userExists = useAppSelector((state) => state.userExists)
    const headerMode = useAppSelector((state) => state.headerMode)

    const credentialResponse = (response: CredentialResponse) => {
        if (response && response.credential) {
            const accessToken = response.credential
            loginWithAccessToken(accessToken, dispatch, navigate)

            // user account exists for this Google ID - connect to websocket service
            // connectSocket(body.userId, dispatch)
        } else {
            dispatch(addErrorMessage("Failed to get response from login request."))
        }
    }

    const navigateToCreateAccount = () => {
        navigate("/create-account")
    }

    const navigateToEditProfile = () => {
        navigate("/edit-profile")
    }

    const navigateToFriendList = () => {
        navigate("/friends")
    }

    const navigateToBlockList = () => {
        navigate("/blocked")
    }

    useEffect(() => {
        checkPersistentLogin(dispatch, navigate)
    }, [])

    return (
        <nav className="header">
            <div className="header--group">
                <div title="Home">
                    <Link to="/">
                        <img src={`${window.location.origin}/images/logo.png`}></img>
                    </Link>
                </div>
                {headerMode === HeaderMode.CAN_EDIT_PROFILE &&
                    <>
                        <button className="linkButton" onClick={navigateToEditProfile}>Edit profile</button>
                        <button className="linkButton" onClick={navigateToFriendList}>Your friends</button>
                        <button className="linkButton" onClick={navigateToBlockList}>Blocked handles</button>
                    </>
                }
            </div>
            <div className="header--group">
                <button className="linkButton" onClick={() => {
                    doAPICall('DELETE', '/clear-db', dispatch, navigate, null, (body) => {
                        console.log("DB cleared")
                    })
                }}>Clear DB</button>
                {token && !userExists && <button className="linkButton" onClick={navigateToCreateAccount}>Create Account</button>}
                <div>
                    {token ? <button className="linkButton" onClick={() => logoutOfSite(dispatch, navigate)}>Logout</button> : (
                        showLogin && <GoogleLogin
                            onSuccess={credentialResponse}
                            onError={() => {
                                dispatch(addErrorMessage("Error - unable to login."))
                            }}
                            theme="filled_black"
                            useOneTap
                            auto_select
                        />)
                    }
                </div>
            </div>
        </nav >
    )
}