import * as Persistence from "../persistence"
import consts from "../consts"
import { getUserIdFromToken } from "../userGetter"
import { deleteMedia, safeSearchImage, storeMedia } from "./general"

export async function getUserByUsername(username: string) {
    return await Persistence.getUserByUsername(username)
}

export async function createOrUpdateAccount(
    userId: string, // is falsy if this is account creation
    googleid: string,
    username: string, // is null if this is edit profile
    bio: string,
    shortBio: string,
    avatarUploadFilename: string,
    isDeleteAvatar: boolean,
    callback: (responseVal: any) => void
) {

    // perform safe search detection on the avatar
    if (avatarUploadFilename && !await safeSearchImage(avatarUploadFilename)) {
        throw new Error(`avatar/Uploaded file has been found to likely contain objectionable content. See: terms of service.`)
    }

    await Persistence.createOrUpdateAccountHelper(userId, googleid, username, bio, shortBio)
    // send the response back to the client before doing cloud storage operations
    callback("OK")

    let avatarFilename: string = null
    try {
        if (isDeleteAvatar) {
            const deleteAvatarFilename = await Persistence.deleteAndGetUserAvatar(userId)
            await deleteMedia(consts.CLOUD_STORAGE_AVATAR_BUCKETNAME, avatarFilename)
        }
        if (avatarUploadFilename) {
            if (!userId) {
                // Newly-created user ID
                userId = await getUserIdFromToken(googleid)
            }

            avatarFilename = `${userId}_avatar`
            await storeMedia(
                consts.CLOUD_STORAGE_AVATAR_BUCKETNAME,
                avatarUploadFilename,
                avatarFilename
            )
        }
    } catch (error) {
        // TODO: report cloud storage errors
        console.log(`Cloud storage error: ${error.message}`)
    }

    try {
        if (avatarFilename) {
            await Persistence.updateUserAvatar(userId, avatarFilename)
        }
    } catch (error) {
        // TODO: report DB errors
        console.log(`DB error: ${error.message}`)
    }
}

export async function deleteUserAccount(
    googleid: string,
    callback: (responseVal: any) => void
) {
    const avatarFilename = await Persistence.getUserAvatar(googleid)
    await Persistence.deleteUser(googleid)
    // send the response back to the client before doing cloud storage operations
    callback("OK")

    if (avatarFilename) {
        try {
            await deleteMedia(consts.CLOUD_STORAGE_AVATAR_BUCKETNAME, avatarFilename)
        } catch (error) {
            // TODO: report cloud storage errors
            console.log(`Cloud storage error: ${error.message}`)
        }
    }
}