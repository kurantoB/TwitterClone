import axios, { AxiosResponse } from "axios"
import { AnyAction, Dispatch, ThunkDispatch } from '@reduxjs/toolkit'
import { AppState, addErrorMessage, logout } from "./appState"
import { NavigateFunction } from "react-router-dom"

type ResponseData = {
    error?: string
    body?: any
}

export default function doAPICall(
    method: string,
    route: string,
    dispatch: ThunkDispatch<AppState, undefined, AnyAction> & Dispatch<AnyAction>,
    navigate: NavigateFunction,
    token: string | null,
    execute: (body: any) => void,
    formData: any = null,
    errorCallback: (error: string, body: any) => void = (error, body) => {
        dispatch(addErrorMessage(error))
        console.log(`API error: error = ${error}, body = ${JSON.stringify(body)}`)
    }
) {
    dispatch(addErrorMessage(`Making API call: ${method} ${route}`))
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
                if (error.status === 401) {
                    dispatch(addErrorMessage("Request failed - 401 unauthorized"))
                    dispatch(logout())
                    navigate("")
                } else {
                    dispatch(addErrorMessage(error.message))
                }
            })
    }
}