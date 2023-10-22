import axios, { AxiosResponse } from "axios"
import { AnyAction, Dispatch, ThunkDispatch } from '@reduxjs/toolkit'
import { AppState, addErrorMessage, logout } from "./appState"
import { NavigateFunction } from "react-router-dom"
import { googleLogout } from "@react-oauth/google"

type ResponseData = {
    error?: string
    body?: any
}

export default function doAPICall(
    method: string,
    route: string,
    dispatch: ThunkDispatch<AppState, undefined, AnyAction> & Dispatch<AnyAction>,
    navigate: NavigateFunction | null,
    token: string | null,
    execute: (body: any) => void,
    formData: any = null,
    errorCallback: (error: string, body: any) => void = (error, body) => {
        dispatch(addErrorMessage(error))
        console.log(`API error: error = ${error}, body = ${JSON.stringify(body)}`)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    effectDependencyName: string = "",
    effectDependency: any = null
) {
    if (effectDependencyName === "") {
        // dispatch(addErrorMessage(`Making API call: ${method} ${route}`))
    } else {
        // dispatch(addErrorMessage(`Making API call: ${method} ${route} per change in ${effectDependencyName}: ${JSON.stringify(effectDependency)}`))
    }
    const axiosInstance = axios.create({
        baseURL: process.env.REACT_APP_BASE_URL
    })
    axiosInstance.interceptors.request.use((config) => {
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`
        }
        return config
    })
    let resPromise: Promise<AxiosResponse<ResponseData, any>> | null = null
    if (method === 'GET') {
        resPromise = axiosInstance.get(route)
    } else if (method === 'POST') {
        if (formData) {
            resPromise = axiosInstance.post(route, formData)
        } else {
            resPromise = axiosInstance.post(route)
        }
    } else if (method === 'PATCH') {
        if (formData) {
            resPromise = axiosInstance.patch(route, formData)
        } else {
            resPromise = axiosInstance.patch(route)
        }
    } else if (method === 'DELETE') {
        resPromise = axiosInstance.delete(route)
    }
    if (resPromise) {
        resPromise
            .then((response) => {
                if (response.data.error) {
                    errorCallback(response.data.error, response.data.body)
                } else if (response.data.body) {
                    execute(response.data.body)
                }
            })
            .catch((error) => {
                if (error.response.status === 401) {
                    dispatch(addErrorMessage("Request failed - unauthorized"))
                    dispatch(logout())
                    if (navigate) {
                        navigate("/")
                    }
                    googleLogout()
                } else {
                    dispatch(addErrorMessage(`Request failed - ${error.message}`))
                }
            })
    }
}