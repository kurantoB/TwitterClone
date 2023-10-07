import * as Persistence from '../persistence'

export async function getUserHasAvatar(userId: string) {
    return Persistence.getUserAvatar(userId).then((avatar) => (avatar ? true : false))
}