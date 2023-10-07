import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export type AppState = {
    tokenId: string | null
    errorMessages: string[]
    websocket: any | null
    newNotifCount: number
    userIdToDMCount: { [userId: string]: number }
}

const initialState: AppState = {
    tokenId: null,
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
        logout: (state) => {
            state.tokenId = null
            state.websocket = null
            state.newNotifCount = 0
            state.userIdToDMCount = {}
        },
        connectSocket: (state, action: PayloadAction<any>) => {
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