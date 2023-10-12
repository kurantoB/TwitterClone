import { EntityManager, ILike, IsNull } from "typeorm";
import consts from "./consts";
import { DM } from "./entity/DM";
import { FeedActivity, FeedActivityType } from "./entity/FeedActivity";
import { Notification, NotificationType } from "./entity/Notification";
import { Post } from "./entity/Post";
import { User } from "./entity/User";
import { AppDataSource } from "./data-source";

export async function initialize() {
    await AppDataSource.initialize()
}



// users

export async function getUser(googleid: string) {
    return await AppDataSource.
        getRepository(User).
        findOneBy({ googleid })
}

export async function deleteUser(userId: string) {
    const dmsToDelete = await AppDataSource.getRepository(DM).find({
        where: [
            {
                sender: { id: userId },
                recipient: IsNull()
            },
            {
                sender: IsNull(),
                recipient: { id: userId }
            }
        ]
    })
    await AppDataSource.getRepository(DM).remove(dmsToDelete)
    return await AppDataSource.getRepository(User).delete(userId)
}

export async function createOrUpdateAccountHelper(
    userId: string, // is null if this is account creation
    googleid: string,
    username: string,
    bio: string,
    shortBio: string,
) {
    await doTransaction(async (em: EntityManager) => {
        let user: User
        if (userId) {
            user = await em.findOneBy(User, { id: userId })
        } else {
            const userLimitExceeded = await em.count(User) === consts.MAX_USERS
            if (userLimitExceeded) {
                throw new Error("User limit exceeded.")
            }
            user = new User()
            user.googleid = googleid
        }
        if (username !== user.username) {
            const alreadyExists = await em.find(User, {
                where: { username: ILike(`${username}`) }
            }).then((users) => users.length > 0)
            if (alreadyExists) {
                throw new Error(`username/Unable to set username: ${username} is already taken.`)
            } else {
                user.username = username
            }
        }
        user.bio = bio
        user.shortBio = shortBio
        await em.save(User, user)
    })
}

export async function deleteAndGetUserAvatar(userId: string) {
    return AppDataSource.getRepository(User).findOneBy({
        id: userId
    }).then(async (user) => {
        const avatar = user.avatar
        user.avatar = null
        await AppDataSource.getRepository(User).save(user)
        return avatar
    })
}

export function updateUserAvatar(userId: string, avatarFilename: string) {
    return AppDataSource.getRepository(User).findOneBy({
        id: userId
    }).then(async (user) => {
        user.avatar = avatarFilename
        return await AppDataSource.getRepository(User).save(user)
    })
}

export async function getUserAvatar(userId: string) {
    return AppDataSource.getRepository(User).findOneBy({
        id: userId
    }).then((user) => user.avatar)
}



// posts

// message is checked for length beforehand
export async function postOrReply(
    user: User,
    message: string,
    parentPost: Post = null
) {
    const userPostCount = await AppDataSource.getRepository(Post).count({
        where: { author: { id: user.id } }
    })
    if (userPostCount >= consts.MAX_POSTS_PER_USER) {
        throw new Error("Max number of posts per user exceeded")
    }

    const newPost = new Post()
    newPost.author = user
    if (message.length > consts.MAX_POST_PREVIEW_LENGTH) {
        newPost.body = message.substring(0, consts.MAX_POST_PREVIEW_LENGTH)
        newPost.extension = message.substring(consts.MAX_POST_PREVIEW_LENGTH)
    } else {
        newPost.body = message
    }
    if (parentPost) {
        newPost.parentPost = parentPost
    }
    return await AppDataSource.getRepository(Post).save(newPost)
}

export async function postOrReplyHook(
    newPost: Post,
    parentPost: Post = null,
) {
    if (parentPost) {
        try {
            await makeNotification(
                parentPost.author,
                NotificationType.REPLY,
                newPost,
                newPost.author
            )
        } catch (error) {
            console.log("post or reply hook make notification error")
            // do nothing
        }
    }
    return await makeFeedActivity(
        newPost.author,
        newPost,
        FeedActivityType.POST
    )
}

// make sure the media is cleared from storage first
export async function deletePost(post: Post) {
    const replies = await AppDataSource
        .getRepository(Post)
        .createQueryBuilder("post")
        .where("post.parentPost = :post_id", { post_id: post.id })
        .getMany()
    replies.forEach((reply) => {
        reply.isParentPostDeleted = true
    })
    await AppDataSource.getRepository(Post).save(replies)
    return await AppDataSource.getRepository(Post).remove(post)
}



// likes

export async function likePost(user: User, post: Post) {
    return await handleLikePost(user, post, true)
}

export async function unlikePost(user: User, post: Post) {
    return await handleLikePost(user, post, false)
}

export async function likePostHook(user: User, post: Post, action: boolean) {
    try {
        await makeNotification(
            post.author,
            NotificationType.LIKE,
            post,
            user,
            action
        )
    }
    catch (error) {
        console.log("like post hook make notification error")
        // do nothing
    }
    return await makeFeedActivity(
        user,
        post,
        FeedActivityType.LIKE,
        action
    )
}

export async function handleLikePost(user: User, { id }: Post, action: boolean) {
    const loadedPost = await AppDataSource.getRepository(Post).findOne({
        relations: {
            likedBy: true,
            author: true
        },
        where: { id }
    })
    if (action) {
        if (loadedPost.likedBy.filter((checkUser) => checkUser.id === user.id).length === 0) {
            loadedPost.likedBy.push(user)
        }
    } else {
        loadedPost.likedBy = loadedPost.likedBy.filter((checkUser) => checkUser.id !== user.id)
    }
    return await AppDataSource.getRepository(Post).save(loadedPost)
}

export async function getPostLikes(post: Post) {
    return AppDataSource.getRepository(Post).findOne({
        where: { id: post.id },
        relations: {
            likedBy: true
        }
    }).then((thisPost) => thisPost.likedBy)
}



// reposts

export async function repostPost(user: User, post: Post) {
    return await handleRepostPost(user, post, true)
}

export async function unrepostPost(user: User, post: Post) {
    return await handleRepostPost(user, post, false)
}

export async function repostHook(user: User, post: Post, action: boolean) {
    try {
        await makeNotification(
            post.author,
            NotificationType.REPOST,
            post,
            user,
            action
        )
    } catch (error) {
        console.log("repost hook make notification error")
        // do nothing
    }
    return await makeFeedActivity(
        user,
        post,
        FeedActivityType.REPOST,
        action
    )
}

export async function handleRepostPost(user: User, { id }: Post, action: boolean) {
    const loadedPost = await AppDataSource.getRepository(Post).findOne({
        relations: { reposters: true },
        where: { id }
    })
    if (action) {
        if (loadedPost.reposters.filter((checkUser) => checkUser.id === user.id).length === 0) {
            loadedPost.reposters.push(user)
        }
    } else {
        loadedPost.reposters = loadedPost.reposters.filter((checkUser) => checkUser.id !== user.id)
    }
    return await AppDataSource.getRepository(Post).save(loadedPost)
}

export async function getPostReposts(post: Post) {
    return AppDataSource.getRepository(Post).findOne({
        where: { id: post.id },
        relations: {
            reposters: true
        }
    }).then((thisPost) => thisPost.reposters)
}



// follows

export async function follow(user: User, targetUser: User) {
    return await handleFollow(user, targetUser, true)
}

export async function unfollow(user: User, targetUser: User) {
    return await handleFollow(user, targetUser, false)
}

export async function followHook(sourceUser: User, targetUser: User, action: boolean) {
    return await makeNotification(
        targetUser,
        NotificationType.FOLLOW,
        null,
        sourceUser,
        action
    )
}

export async function handleFollow(sourceUser: User, targetUser: User, action: boolean) {
    await doTransaction(async (em) => {
        const loadedSourceUser = await em.findOne(User, {
            relations: {
                following: true,
                followers: true
            },
            where: { id: sourceUser.id }
        })

        let mutualDelta = 0
        if (action) {
            if (
                loadedSourceUser.following.length == 0
                || loadedSourceUser.following.filter((user) => user.id === targetUser.id).length === 0
            ) {
                loadedSourceUser.following.push(targetUser)
            }
            if (loadedSourceUser.followers.map((user) => user.id).indexOf(targetUser.id) !== -1) {
                mutualDelta = 1
            }
        } else {
            loadedSourceUser.following = loadedSourceUser.following.filter((user) => user.id !== targetUser.id)
            if (loadedSourceUser.followers.map((user) => user.id).indexOf(targetUser.id) !== -1) {
                mutualDelta = -1
            }
        }
        loadedSourceUser.followingCount = loadedSourceUser.following.length
        loadedSourceUser.mutualCount += mutualDelta
        await em.save(User, loadedSourceUser)

        const loadedTargetUser = await em.findOne(User, {
            relations: {
                followers: true
            },
            where: { id: targetUser.id }
        })
        loadedTargetUser.followerCount = loadedTargetUser.followers.length
        loadedTargetUser.mutualCount += mutualDelta
        await em.save(User, loadedTargetUser)
    })
}

export async function getFollowers(user: User) {
    return AppDataSource.getRepository(User).findOne({
        where: { id: user.id },
        relations: {
            followers: true
        }
    }).then((user) => user.followers)
}

export async function getFollowing(user: User) {
    return AppDataSource.getRepository(User).findOne({
        where: { id: user.id },
        relations: {
            following: true
        }
    }).then((user) => user.following)
}



// blocks

export async function blockUser(user: User, targetUser: User) {
    return await handleBlock(user, targetUser, true)
}

export async function unblockUser(user: User, targetUser: User) {
    return await handleBlock(user, targetUser, false)
}

export async function handleBlock({ id }: User, targetUser: User, action: boolean) {
    const loadedSourceUser = await AppDataSource.getRepository(User).findOne({
        relations: { blockedUsers: true },
        where: { id }
    })
    if (action) {
        if (loadedSourceUser.blockedUsers.filter((user) => user.id === targetUser.id).length === 0) {
            loadedSourceUser.blockedUsers.push(targetUser)
        }
    } else {
        loadedSourceUser.blockedUsers = loadedSourceUser.blockedUsers.filter((user) => user.id !== targetUser.id)
    }
    return await AppDataSource.getRepository(User).save(loadedSourceUser)
}



// DMs

// message is checked for length beforehand
export async function sendDM(dmSender: User, dmRecipient: User, message: string) {
    // generate DM id
    // declare next id
    // check the largest number
    // if it is = 2 * consts.NUMBER_OF_RETRIEVABLE_DM_S - 1,
    //   check largest number < NUMBER_OF_RETRIEVABLE_DM_S (this shouldn't be one less than that value)
    //   if it is nonexistent,
    //     next id = 0
    //   else,
    //     next id = largest number + 1
    //     if it is = consts.NUMBER_OF_RETRIEVABLE_DM_S - 2,
    //       set clear latter flag
    // else,
    //   next id = largest number + 1
    //   if it is = 2 * consts.NUMBER_OF_RETRIEVABLE_DM_S - 2,
    //     set clear former flag
    //
    // execute on clear former or clear latter flags
    // execute on DM insertion
    return await AppDataSource.manager.transaction(
        "SERIALIZABLE",
        async (transactionEntityManager) => {

            let nextOrdering: number
            let clearFormer = false
            let clearLatter = false

            let largest
            const largestOrderingDM = await transactionEntityManager.findOne(DM, {
                where: [
                    { sender: { id: dmSender.id } },
                    { recipient: { id: dmSender.id } }
                ],
                order: {
                    ordering: "DESC"
                }
            })
            if (largestOrderingDM) {
                largest = largestOrderingDM.ordering
                if (largest === 2 * consts.NUMBER_OF_RETRIEVABLE_DM_S - 1) {

                    largest = await transactionEntityManager
                        .getRepository(DM)
                        .createQueryBuilder("dm")
                        .where("dm.id like :queryID", { queryID: `%${dmSender.id}%` })
                        .andWhere("dm.id like :queryID", { queryID: `%${dmRecipient.id}%` })
                        .andWhere("dm.ordering < :threshold", { threshold: consts.NUMBER_OF_RETRIEVABLE_DM_S })
                        .orderBy("dm.ordering", "DESC")
                        .getOne()
                        .then((dm) => dm?.ordering)
                    if (largest === undefined) {
                        nextOrdering = 0
                    } else {
                        nextOrdering = largest + 1
                        if (largest === consts.NUMBER_OF_RETRIEVABLE_DM_S - 2) {
                            clearLatter = true
                        }
                    }
                } else {
                    nextOrdering = largest + 1
                    if (largest === 2 * consts.NUMBER_OF_RETRIEVABLE_DM_S - 2) {
                        clearFormer = true
                    }
                }

                if (clearFormer) {
                    const deleteDmIDs = await transactionEntityManager
                        .getRepository(DM)
                        .createQueryBuilder("dm")
                        .where("dm.id like :queryID", { queryID: `%${dmSender.id}%` })
                        .andWhere("dm.id like :queryID", { queryID: `%${dmRecipient.id}%` })
                        .andWhere("dm.ordering < :threshold", { threshold: consts.NUMBER_OF_RETRIEVABLE_DM_S })
                        .getMany()
                        .then((dms) => dms.map((dm) => dm.id))
                    await transactionEntityManager.delete(DM, deleteDmIDs)
                } else if (clearLatter) {
                    const deleteDmIDs = await transactionEntityManager
                        .getRepository(DM)
                        .createQueryBuilder("dm")
                        .where("dm.id like :queryID", { queryID: `%${dmSender.id}%` })
                        .andWhere("dm.id like :queryID", { queryID: `%${dmRecipient.id}%` })
                        .andWhere("dm.ordering >= :threshold", { threshold: consts.NUMBER_OF_RETRIEVABLE_DM_S })
                        .getMany()
                        .then((dms) => dms.map((dm) => dm.id))
                    await transactionEntityManager.delete(DM, deleteDmIDs)
                }
            } else {
                nextOrdering = 0
            }

            const dm = new DM()
            dm.id = dmSender.id + "/" + dmRecipient.id + ":" + nextOrdering
            dm.ordering = nextOrdering
            dm.sender = dmSender
            dm.recipient = dmRecipient
            dm.message = message
            return await transactionEntityManager.save(dm)
        }
    )
}

export async function getOneOnOneDMs(user1ID: string, user2ID: string) {
    return await AppDataSource
        .getRepository(DM)
        .createQueryBuilder("dm")
        .leftJoinAndSelect("dm.sender", "sender")
        .where("dm.id like :queryID", { queryID: `%${user1ID}%` })
        .andWhere("dm.id like :queryID", { queryID: `%${user2ID}%` })
        .getMany()
}

export async function deleteDM(dm: DM) {
    return await AppDataSource.getRepository(DM).update(
        { id: dm.id },
        {
            isDeleted: true,
            message: consts.DELETED_DM_PLACEHOLDER
        }
    )
}



// action comes into play as false when a user unfollows, unlikes, or unreposts
async function makeNotification(
    user: User,
    type: NotificationType,
    sourcePost: Post | null,
    sourceUser: User,
    action: boolean = true
) {
    if (action) {
        const notification = new Notification()
        notification.user = user
        notification.type = type
        notification.sourcePost = sourcePost
        notification.sourceUser = sourceUser
        const date = new Date()
        date.setDate(date.getDate() + consts.NOTIFICATION_EXPIRY_DAYS)
        notification.expiryDate = date
        return await AppDataSource.getRepository(Notification).save(notification)
    } else {
        return await AppDataSource.getRepository(Notification).delete({
            user, type, sourcePost, sourceUser
        })
    }
}

// action comes into play as false when a post is unliked or unreposted
async function makeFeedActivity(
    sourceUser: User,
    sourcePost: Post,
    type: FeedActivityType,
    action: boolean = true
) {
    if (action) {
        const feedActivity = new FeedActivity()
        feedActivity.sourceUser = sourceUser
        feedActivity.sourcePost = sourcePost
        feedActivity.type = type
        const date = new Date()
        date.setDate(date.getDate() + consts.FEED_ACTIVITY_EXPIRY_DAYS)
        feedActivity.expiryDate = date
        return await AppDataSource.getRepository(FeedActivity).save(feedActivity)
    } else {
        return await AppDataSource.getRepository(FeedActivity).delete({
            sourceUser, sourcePost, type
        })
    }
}



export async function doTransaction(transactionCall: (
    entityManager: EntityManager) => Promise<void>
) {
    return await AppDataSource.manager.transaction(
        "SERIALIZABLE",
        async (transactionEntityManager: EntityManager) => {
            await transactionCall(transactionEntityManager)
        }
    )
}



// testing

export async function clearDB() {
    try {
        const users = await AppDataSource.getRepository(User).find()
        await AppDataSource.getRepository(User).remove(users)
    } catch (error) {
        console.log("error clearing users: " + error.message)
        throw error
    }

    try {
        const DMs = await AppDataSource.getRepository(DM).find()
        await AppDataSource.getRepository(DM).remove(DMs)
    } catch (error) {
        console.log("error clearing DMs: " + error.message)
        throw error
    }
}

export async function getNotification(
    user: User,
    type: NotificationType,
    sourcePost: Post | null,
    sourceUser: User
) {
    return await AppDataSource.getRepository(Notification).findOne({
        where: {
            user: { id: user.id },
            type,
            sourcePost: { id: sourcePost.id },
            sourceUser: { id: sourceUser.id }
        }
    })
}

export async function getFeedActivity(
    sourceUser: User,
    sourcePost: Post,
    type: FeedActivityType
) {
    return await AppDataSource.getRepository(FeedActivity).findOne({
        where: {
            sourceUser: { id: sourceUser.id },
            sourcePost: { id: sourcePost.id },
            type
        }
    })
}

export async function getPostByID(id: string) {
    return await AppDataSource.getRepository(Post).findOne({
        where: { id }
    })
}