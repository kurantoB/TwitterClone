import { io } from 'socket.io-client'
import {
    connectSocket as stateConnectSocket,
    disconnectSocket,
    receiveNotifications,
    receiveDMsFromUser,
    addErrorMessage,
    AppState
} from './appState'
import { AnyAction, Dispatch, ThunkDispatch } from '@reduxjs/toolkit'

var Hashes = require('jshashes')

var hosts: string[] = JSON.parse(process.env.REACT_APP_HOSTS ?? '[]')
var ports: string[] = JSON.parse(process.env.REACT_APP_PORTS ?? '[]')

export default function connectSocket(userId: string, dispatch: ThunkDispatch<AppState, undefined, AnyAction> & Dispatch<AnyAction>): boolean {
    var hostAndPort = getHostAndPort(userId)
    if (!hostAndPort) {
        return false
    }

    let [host, port] = hostAndPort
    const socket = io(host + ":" + port, {
        reconnection: false
    })
    
    socket.on('connect', () => {
        dispatch(stateConnectSocket(socket))
    })

    socket.on('disconnect', () => {
        dispatch(disconnectSocket())
    })

    socket.on('connect_error', () => {
        dispatch(disconnectSocket())
        dispatch(addErrorMessage("Error - unable to connect to notifications service."))
    })

    socket.on('new-notif', (numOfNotifs) => {
        dispatch(receiveNotifications(numOfNotifs))
    })

    socket.on('new-dm', (userId, numOfDMs) => {
        dispatch(receiveDMsFromUser([userId, numOfDMs]))
    })

    return true
}

function getHostAndPort(userId: string): [string, string] | null {
    if (hosts.length === 0 || ports.length === 0) {
        return null
    }

    let SHA1: string = new Hashes.SHA1().hex(userId)

    // Since we are using the last char of the hash's hex value, we can have a maximum of 16 hosts
    let poolSize = 16
    
    let lastVal = SHA1.charAt(SHA1.length - 1)
    let fraction = (parseInt(lastVal, 16) - parseInt('0', 16)) / poolSize
    let targetHostIndex = Math.floor(hosts.length * fraction)
    let targetHost = hosts[targetHostIndex]
    let targetPort = ports[targetHostIndex]

    return [targetHost, targetPort]
}