import { Link, useNavigate } from "react-router-dom"
import { useAppSelector, useAppDispatch } from "../app/hooks"
import { HeaderMode, addErrorMessage, findUser, login, logout } from "../app/appState"
import { GoogleLogin, googleLogout } from '@react-oauth/google'
import connectSocket from "../app/socket"
import doAPICall from "../app/apiLayer"

export default function Header() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    const isLoggedIn = useAppSelector((state) => state.tokenId ? true : false)
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
                }
            })
        }
    }

    const navigateToCreateOrEditAccount = () => {
        navigate("/create-account")
    }

    const logoutAndNavigate = () => {
        dispatch(logout())
        navigate("")
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
                    <button className="linkButton" onClick={navigateToCreateOrEditAccount}>Edit Profile</button>
                }
            </div>
            <div className="header--group">
                <button className="linkButton" onClick={() => {
                    doAPICall('DELETE', '/clear-db', dispatch, navigate, null, (body) => {
                        console.log("DB cleared")
                    })
                }}>Clear DB</button>
                {isLoggedIn && !userExists && <button className="linkButton" onClick={navigateToCreateOrEditAccount}>Create Account</button>}
                <div>
                    {isLoggedIn ? <button className="linkButton" onClick={logoutAndNavigate}>Logout</button> : <GoogleLogin
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