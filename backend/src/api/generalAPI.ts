import * as Persistence from '../persistence'

export async function getUserHasAvatar(googleid: string) {
    return Persistence.getUserAvatar(googleid).then((avatar) => (avatar ? true : false))
}

export async function getFollowingRelationship(sourceUserGoogleId: string, targetUserId: string) {
    return Persistence.getFollowRelationship(sourceUserGoogleId, targetUserId)
}