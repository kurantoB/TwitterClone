import { io } from 'socket.io-client'
import { useAppDispatch } from './hooks'
import {
    connectSocket as stateConnectSocket,
    disconnectSocket,
    receiveNotifications,
    receiveDMsFromUser
} from './appState'

var Hashes = require('jshashes')

var hosts: string[] = JSON.parse(process.env.REACT_APP_HOSTS ?? '[]')
var ports: string[] = JSON.parse(process.env.REACT_APP_PORTS ?? '[]')

const dispatch = useAppDispatch()

export default function connectSocket(userUuid: string): boolean {
    var hostAndPort = getHostAndPort(userUuid)
    if (!hostAndPort) {
        return false
    }

    let [host, port] = hostAndPort
    const socket = io(host + ":" + port)
    
    socket.on('connect', () => {
        dispatch(stateConnectSocket(socket))
    })

    socket.on('disconnect', () => {
        dispatch(disconnectSocket())
    })

    socket.on('connect_error', () => {
        dispatch(disconnectSocket())
    })

    socket.on('new-notif', (numOfNotifs) => {
        dispatch(receiveNotifications(numOfNotifs))
    })

    socket.on('new-dm', (userUuid, numOfDMs) => {
        dispatch(receiveDMsFromUser([userUuid, numOfDMs]))
    })

    return true
}

function getHostAndPort(userUuid: string): [string, string] | null {
    if (hosts.length === 0 || ports.length === 0) {
        return null
    }

    let SHA1: string = new Hashes.SHA1().hex(userUuid)

    // Since we are using the last char of the hash's hex value, we can have a maximum of 16 hosts
    let poolSize = 16
    
    let lastVal = SHA1.charAt(SHA1.length - 1)
    let fraction = (parseInt(lastVal, 16) - parseInt('0', 16)) / poolSize
    let targetHostIndex = Math.floor(hosts.length * fraction)
    let targetHost = hosts[targetHostIndex]
    let targetPort = ports[targetHostIndex]

    return [targetHost, targetPort]
}