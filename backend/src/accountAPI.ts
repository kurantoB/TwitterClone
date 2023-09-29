import { User } from "./entity/User"
import * as Persistence from "./persistence"
import { EntityManager } from "typeorm"
import { UserLimitExceededError, UsernameExistsError } from "./errors"
import { Storage } from "@google-cloud/storage"
import consts from "./consts"
import path from "path"

export async function accountExists(googleid: string): Promise<boolean> {
    return await Persistence.getUser(googleid) != null
}

export async function createOrUpdateAccount(
    userId: string,
    googleid: string,
    username: string,
    bio: string,
    avatarUploadFilename: string,
    isDeleteAvatar: boolean,
    errors: Error[],
    callback: () => void
) {
    try {
        await createOrUpdateAccountHelper(userId, googleid, username, bio, errors)
    } catch (error) {
        errors.push(error)
    }

    // send the response back to the client before doing cloud storage operations
    callback()

    try {
        if (isDeleteAvatar) {
            const avatarFilename = await Persistence.deleteAndGetUserAvatar(userId)
            await deleteAvatarFromCloudStorage(avatarFilename)
        }
        if (avatarUploadFilename) {
            const extension = path.extname(avatarUploadFilename)
            const avatarFilename = `${userId}/avatar${extension}`
            const existingAvatar = await Persistence.getUserAvatar(userId)
            const storage = new Storage()
            const bucket = storage.bucket(consts.CLOUD_STORAGE_AVATAR_BUCKETNAME)
            if (existingAvatar !== avatarFilename) {
                await bucket.file(existingAvatar).delete()
            }
            await bucket.upload(avatarUploadFilename, { destination: avatarFilename })
        }
    } catch (error) {
        // TODO: report cloud storage errors
    }
}

export async function deleteUser(
    userId: string,
    errors: Error[],
    callback: () => void
) {
    let avatarFilename
    try {
        avatarFilename = await Persistence.getUserAvatar(userId)
    } catch (error) {
        errors.push(error)
    }

    try {
        await Persistence.deleteUser(userId)
    } catch (error) {
        errors.push(error)
    }

    // send the response back to the client before doing cloud storage operations
    callback()

    if (avatarFilename) {
        try {
            await deleteAvatarFromCloudStorage(avatarFilename)
        } catch (error) {
            // TODO: report cloud storage errors
        }
    }
}

async function createOrUpdateAccountHelper(
    userId: string, // determines whether this is an insert or update
    googleid: string,
    username: string,
    bio: string,
    errors: Error[]
) {
    await Persistence.doTransaction(async (em: EntityManager) => {
        let user: User
        if (userId) {
            user = await Persistence.transactionalGetUser(em, userId)
        } else {
            const userLimitExceeded = await Persistence.transactionalGetUserCountIsAtLimit(em)
            if (userLimitExceeded) {
                throw new UserLimitExceededError("User limit exceeded.")
            }
            user = new User()
            user.googleid = googleid
        }
        if (username) {
            const alreadyExists = await Persistence.transactionalGetUsernameExists(em, username)
            if (alreadyExists) {
                errors.push(new UsernameExistsError(`Unable to set username: ${username} is already taken.`))
            } else {
                user.username = username
            }
        }
        if (bio) {
            user.bio = bio
        }
        Persistence.transactionalSaveUser(em, user)
    })
}

async function deleteAvatarFromCloudStorage(avatarFilename: string) {
    const storage = new Storage()
    await storage
        .bucket(consts.CLOUD_STORAGE_AVATAR_BUCKETNAME)
        .file(avatarFilename)
        .delete()
}