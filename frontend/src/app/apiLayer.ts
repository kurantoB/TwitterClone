import axios, { AxiosResponse } from "axios"
import { AnyAction, Dispatch, ThunkDispatch } from '@reduxjs/toolkit'
import { AppState, addErrorMessage } from "./appState"

type ResponseData = {
    error?: string
    body?: any
}

export default function doAPICall(
    method: string,
    route: string,
    dispatch: ThunkDispatch<AppState, undefined, AnyAction> & Dispatch<AnyAction>,
    token: string | null,
    execute: (body: any) => void
) {
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
        resPromise = axiosInstance.post(route)
    } else if (method === 'PATCH') {
        resPromise = axiosInstance.patch(route)
    } else if (method === 'DELETE') {
        resPromise = axiosInstance.delete(route)
    }
    if (resPromise) {
        resPromise
            .then((response) => {
                if (response.data.error) {
                    dispatch(addErrorMessage(response.data.error))
                } else if (response.data.body) {
                    execute(response.data.body)
                }
            })
            .catch((error) => {
                dispatch(addErrorMessage(error.message))
            })
    }
}