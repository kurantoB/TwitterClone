import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export type AppState = {
    userUuid: string | null
    websocket: any | null
    newNotifCount: number
    userUuidToDMCount: { [userUuid: string]: number }
}

const initialState: AppState = {
    userUuid: null,
    websocket: null,
    newNotifCount: 0,
    userUuidToDMCount: {}
}

const appState = createSlice({
    name: "appState",
    initialState,
    reducers: {
        login: (state, action: PayloadAction<string>) => {
            state.userUuid = action.payload
        },
        logout: (state) => {
            state.userUuid = null
            state.websocket = null
            state.newNotifCount = 0
            state.userUuidToDMCount = {}
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
            let userUuid = action.payload[0]
            state.userUuidToDMCount[userUuid]
                = userUuid in state.userUuidToDMCount ? state.userUuidToDMCount[userUuid] + action.payload[1] : action.payload[1]
        },
        resetDMsFromUser: (state, action: PayloadAction<string>) => {
            delete state.userUuidToDMCount[action.payload]
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
    resetDMsFromUser
} = appState.actions