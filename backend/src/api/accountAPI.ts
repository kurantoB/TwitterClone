import { User } from "../entity/User"
import * as Persistence from "../persistence"
import { EntityManager } from "typeorm"
import { Storage } from "@google-cloud/storage"
import consts from "../consts"

export async function createOrUpdateAccount(
    userId: string, // is falsy if this is account creation
    googleid: string,
    username: string,
    bio: string,
    avatarUploadFilename: string,
    isDeleteAvatar: boolean,
    callback: (responseVal: any) => void
) {
    await createOrUpdateAccountHelper(userId, googleid, username, bio)
    // send the response back to the client before doing cloud storage operations
    callback(null)

    let avatarFilename: string = null
    try {
        if (isDeleteAvatar) {
            const deleteAvatarFilename = await Persistence.deleteAndGetUserAvatar(userId)
            await deleteAvatarFromCloudStorage(deleteAvatarFilename)
        }
        if (avatarUploadFilename) {
            avatarFilename = `${userId}/avatar`
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
    userId: string,
    callback: (responseVal: any) => void
) {
    const avatarFilename = await Persistence.getUserAvatar(userId)

    await Persistence.deleteUser(userId)
    // send the response back to the client before doing cloud storage operations
    callback(null)

    if (avatarFilename) {
        try {
            await deleteAvatarFromCloudStorage(avatarFilename)
        } catch (error) {
            // TODO: report cloud storage errors
            console.log(`Cloud storage error: ${error.message}`)
        }
    }
}

async function createOrUpdateAccountHelper(
    userId: string, // is null if this is account creation
    googleid: string,
    username: string,
    bio: string
) {
    await Persistence.doTransaction(async (em: EntityManager) => {
        let user: User
        if (userId) {
            user = await Persistence.transactionalGetUser(em, userId)
        } else {
            const userLimitExceeded = await Persistence.transactionalGetUserCountIsAtLimit(em)
            if (userLimitExceeded) {
                throw new Error("User limit exceeded.")
            }
            user = new User()
            user.googleid = googleid
        }
        if (username !== user.username) {
            const alreadyExists = await Persistence.transactionalGetUsernameExists(em, username)
            if (alreadyExists) {
                throw new Error(`username/Unable to set username: ${username} is already taken.`)
            } else {
                user.username = username
            }
        }
        user.bio = bio
        await Persistence.transactionalSaveUser(em, user)
    })
}

async function deleteAvatarFromCloudStorage(avatarFilename: string) {
    const storage = new Storage()
    await storage
        .bucket(consts.CLOUD_STORAGE_AVATAR_BUCKETNAME)
        .file(avatarFilename)
        .delete()
}