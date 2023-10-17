import * as Persistence from '../persistence'

export async function getUserHasAvatar(googleid: string) {
    return Persistence.getUserAvatar(googleid).then((avatar) => (avatar ? true : false))
}
