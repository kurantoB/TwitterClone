import * as Persistence from './persistence'

export async function getUserIdFromToken(googleid: string) {
    return await Persistence.getUserByGoogleID(googleid).then((user) => {
        return user?.id
    })
}

export async function getUsernameFromToken(googleid: string) {
    return await Persistence.getUserByGoogleID(googleid).then((user) => {
        return user?.username
    })
}