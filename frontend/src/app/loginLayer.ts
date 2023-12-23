import { googleLogout } from "@react-oauth/google"
import { AnyAction, Dispatch, ThunkDispatch } from "@reduxjs/toolkit"
import { AppState, addErrorMessage, findUser, login, logout, missUser } from "./appState"
import doAPICall from "./apiLayer"
import { NavigateFunction } from "react-router-dom"
import consts from "../consts"
import Cookies from "js-cookie"
// import connectSocket from "./socket"

export const loginWithAccessToken = (
    accessToken: string,
    dispatch: ThunkDispatch<AppState, undefined, AnyAction> & Dispatch<AnyAction>,
    navigate: NavigateFunction,
    callback: () => void = () => { }
) => {
    dispatch(login(accessToken))
    Cookies.set('sessionToken', accessToken, { expires: consts.SESSION_TOKEN_EXPIRE_DAYS })

    doAPICall('GET', '/get-userid', dispatch, navigate, accessToken, (body) => {
        dispatch(findUser())

        // user account exists for this Google ID - connect to websocket service
        // connectSocket(body.userId, dispatch)

        callback()
    }, null, (error, body) => {
        if (error === "User not found.") {
            dispatch(missUser())
        } else {
            dispatch(addErrorMessage(error))
            console.log(`API error: error = ${error}, body = ${JSON.stringify(body)}`)
            window.scrollTo({ top: 0, behavior: 'smooth' as ScrollBehavior })

            logoutOfSite(dispatch, navigate)
        }
    })
}

export const logoutOfSite = (
    dispatch: ThunkDispatch<AppState, undefined, AnyAction> & Dispatch<AnyAction>,
    navigate: NavigateFunction | null
) => {
    dispatch(logout())
    googleLogout()
    Cookies.remove('sessionToken')
    if (navigate) {
        navigate("/")
    }
}

export const checkPersistentLogin = (
    dispatch: ThunkDispatch<AppState, undefined, AnyAction> & Dispatch<AnyAction>,
    navigate: NavigateFunction
) => {
    const sessionToken = Cookies.get('sessionToken')
    if (sessionToken) {
        doAPICall('POST', '/check-session', dispatch, navigate, null, (body) => {
            // auto login
            loginWithAccessToken(sessionToken, dispatch, navigate)
        }, { sessionToken }, (error, body) => {
            dispatch(addErrorMessage(error))
            console.log(`API error: error = ${error}, body = ${JSON.stringify(body)}`)
            window.scrollTo({ top: 0, behavior: 'smooth' as ScrollBehavior })

            logoutOfSite(dispatch, navigate)
        })
    } else {
        dispatch(missUser())
    }
}