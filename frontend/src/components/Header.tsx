import { Link, useNavigate } from "react-router-dom"
import { useAppSelector, useAppDispatch } from "../app/hooks"
import { HeaderMode, addErrorMessage, findUser, login, logout } from "../app/appState"
import { GoogleLogin, googleLogout } from '@react-oauth/google'
import connectSocket from "../app/socket"
import doAPICall from "../app/apiLayer"

export default function Header() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    const token = useAppSelector((state) => state.tokenId)
    const userExists = useAppSelector((state) => state.userExists)
    const headerMode = useAppSelector((state) => state.headerMode)

    const credentialResponse = (response: any) => {
        if (response && response.credential) {
            const accessToken = response.credential
            dispatch(login(accessToken))
            doAPICall('GET', '/get-userid', dispatch, navigate, accessToken, (body) => {
                dispatch(findUser())
                // user account exists for this Google ID - connect to websocket service
                connectSocket(body.userId, dispatch)
            }, null, (error, body) => {
                if (error !== "User not found.") {
                    dispatch(addErrorMessage(error))
                    console.log(`API error: error = ${error}, body = ${JSON.stringify(body)}`)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                }
            })
        }
    }

    const navigateToCreateAccount = () => {
        navigate("/create-account")
    }

    const navigateToEditProfile = () => {
        navigate("/edit-profile")
    }

    const navigateToBlockList = () => {
        navigate("/blocked")
    }

    const logoutAndNavigate = () => {
        dispatch(logout())
        navigate("/")
        googleLogout()
    }

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
                        <button className="linkButton" onClick={navigateToEditProfile}>Edit Profile</button>
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
                    {token ? <button className="linkButton" onClick={logoutAndNavigate}>Logout</button> : <GoogleLogin
                        onSuccess={credentialResponse}
                        onError={() => {
                            dispatch(addErrorMessage("Error - unable to login."))
                        }}
                        theme="filled_black"
                        useOneTap
                        auto_select
                    />}
                </div>
            </div>
        </nav >
    )
}