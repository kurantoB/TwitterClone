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

    await Persistence.createOrUpdateAccountHelper(userId, googleid, username, bio, shortBio, !!avatarUploadFilename)

    // send the response back to the client before doing cloud storage operations
    callback("OK")

    try {
        if (isDeleteAvatar) {
            const deleteAvatarFilename = await Persistence.deleteAndGetUserAvatar(userId)
            await deleteMedia(consts.CLOUD_STORAGE_AVATAR_BUCKETNAME, deleteAvatarFilename)
        } else if (avatarUploadFilename) {
            if (!userId) {
                // Newly-created user ID
                userId = await getUserIdFromToken(googleid)
            }

            const avatarFilename = `${userId}_avatar`
            await storeMedia(
                consts.CLOUD_STORAGE_AVATAR_BUCKETNAME,
                avatarUploadFilename,
                avatarFilename
            )
        }
    } catch (error) {
        // TODO: report post-callback errors
        console.log("Create or update account post-callback error: " + error.message)
    }
}

export async function deleteUserAccount(
    googleid: string,
    callback: (responseVal: any) => void
) {
    // must be executed before the user is removed from the DM entries
    await Persistence.cleanupDeletedUserDMs(googleid)
    
    const delResult = await Persistence.deleteUser(googleid)

    // send the response back to the client before doing cleanup operations
    callback("OK")

    try {
        await cleanupDeletedUser(delResult)
    } catch (error) {
        // TODO: report post-callback errors
        console.log("Delete user account post-callback error: " + error.message)
    }
}

export async function cleanupDeletedUser(delResult: Persistence.DeleteUserResult) {
    if (delResult.avatarFilename) {
        await deleteMedia(consts.CLOUD_STORAGE_AVATAR_BUCKETNAME, delResult.avatarFilename)
    }
    if (delResult.mediaPostIds) {
        for (const mediaPostId of delResult.mediaPostIds) {
            await deleteMedia(consts.CLOUD_STORAGE_POSTMEDIA_BUCKETNAME, mediaPostId + "_media")
        }
    }
}