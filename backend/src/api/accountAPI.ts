import * as Persistence from "../persistence"
import { Storage } from "@google-cloud/storage"
import consts from "../consts"
import { getUserIdFromToken } from "../userGetter"

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
    await Persistence.createOrUpdateAccountHelper(userId, googleid, username, bio, shortBio)
    // send the response back to the client before doing cloud storage operations
    callback("OK")

    let avatarFilename: string = null
    try {
        if (isDeleteAvatar) {
            const deleteAvatarFilename = await Persistence.deleteAndGetUserAvatar(userId)
            await deleteAvatarFromCloudStorage(deleteAvatarFilename)
        }
        if (avatarUploadFilename) {
            if (!userId) {
                // Newly-created user ID
                userId = await getUserIdFromToken(googleid)
            }

            avatarFilename = `${userId}_avatar`
            const storage = new Storage()
            const bucket = storage.bucket(consts.CLOUD_STORAGE_AVATAR_BUCKETNAME)
            await bucket.upload(avatarUploadFilename, { destination: avatarFilename })
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

export async function deleteUser(
    googleid: string,
    callback: (responseVal: any) => void
) {
    const avatarFilename = await Persistence.getUserAvatar(googleid)
    await Persistence.deleteUser(googleid)
    // send the response back to the client before doing cloud storage operations
    callback("OK")

    if (avatarFilename) {
        try {
            await deleteAvatarFromCloudStorage(avatarFilename)
        } catch (error) {
            // TODO: report cloud storage errors
            console.log(`Cloud storage error: ${error.message}`)
        }
    }
}

async function deleteAvatarFromCloudStorage(avatarFilename: string) {
    const storage = new Storage()
    await storage
        .bucket(consts.CLOUD_STORAGE_AVATAR_BUCKETNAME)
        .file(avatarFilename)
        .delete()
}