import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { Socket } from "socket.io-client"

export type AppState = {
    tokenId: string | null
    showLogin: boolean
    userExists: boolean
    errorMessages: string[]
    headerMode: HeaderMode
    websocket: any
    newNotifCount: number
    userIdToDMCount: { [userId: string]: number }
}

export enum HeaderMode {
    CAN_EDIT_PROFILE,
    IS_VIEWING_FOR_YOU,
    IS_VIEWING_POPULAR,
    NONE
}

const initialState: AppState = {
    tokenId: null,
    showLogin: false,
    userExists: false,
    errorMessages: [],
    headerMode: HeaderMode.NONE,
    websocket: null,
    newNotifCount: 0,
    userIdToDMCount: {},
}

const appState = createSlice({
    name: "appState",
    initialState,
    reducers: {
        showLogin: (state) => {
            state.showLogin = true
        },
        login: (state, action: PayloadAction<string>) => {
            state.tokenId = action.payload
            state.showLogin = false
        },
        findUser: (state) => {
            state.userExists = true
        },
        logout: (state) => {
            state.showLogin = true
            state.tokenId = null
            state.userExists = false
            state.headerMode = HeaderMode.NONE
            state.websocket?.disconnect()
            state.websocket = null
            state.newNotifCount = 0
            state.userIdToDMCount = {}
        },
        connectSocket: (state, action: PayloadAction<Socket>) => {
            state.websocket = action.payload
        },
        disconnectSocket: (state) => {
            state.websocket = null
        },
        receiveNotifications: (state, action: PayloadAction<number>) => {
            state.newNotifCount += action.payload
        },
        resetNotifications: (state) => {
            state.newNotifCount = 0
        },
        receiveDMsFromUser: (state, action: PayloadAction<[string, number]>) => {
            let userId = action.payload[0]
            state.userIdToDMCount[userId]
                = userId in state.userIdToDMCount ? state.userIdToDMCount[userId] + action.payload[1] : action.payload[1]
        },
        resetDMsFromUser: (state, action: PayloadAction<string>) => {
            delete state.userIdToDMCount[action.payload]
        },
        addErrorMessage: (state, action: PayloadAction<string>) => {
            state.errorMessages.push(action.payload)
        },
        removeErrorMessage: (state, action: PayloadAction<number>) => {
            state.errorMessages = state.errorMessages.filter((_, index) => index !== action.payload)
        },
        setHeaderMode: (state, action: PayloadAction<HeaderMode>) => {
            state.headerMode = action.payload
        }
    }
})

export default appState.reducer
export const {
    showLogin,
    login,
    findUser,
    logout,
    connectSocket,
    disconnectSocket,
    receiveNotifications,
    resetNotifications,
    receiveDMsFromUser,
    resetDMsFromUser,
    addErrorMessage,
    removeErrorMessage,
    setHeaderMode,
} = appState.actions