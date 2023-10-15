import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { Socket } from "socket.io-client"

export type AppState = {
    tokenId: string | null
    userExists: boolean
    errorMessages: string[]
    websocket: any
    newNotifCount: number
    userIdToDMCount: { [userId: string]: number }
}

const initialState: AppState = {
    tokenId: null,
    userExists: false,
    errorMessages: [],
    websocket: null,
    newNotifCount: 0,
    userIdToDMCount: {}
}

const appState = createSlice({
    name: "appState",
    initialState,
    reducers: {
        login: (state, action: PayloadAction<string>) => {
            state.tokenId = action.payload
        },
        findUser: (state) => {
            state.userExists = true
        },
        logout: (state) => {
            state.tokenId = null
            state.userExists = false
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
        }
    }
})

export default appState.reducer
export const {
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
    removeErrorMessage
} = appState.actions