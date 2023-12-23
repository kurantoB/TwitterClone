import { EntityManager, FindOptionsWhere, In, IsNull, MoreThan } from "typeorm";
import consts from "./consts";
import { DM } from "./entity/DM";
import { FeedActivity, FeedActivityType } from "./entity/FeedActivity";
import { Notification, NotificationType } from "./entity/Notification";
import { Post, VisibilityType } from "./entity/Post";
import { User } from "./entity/User";
import { AppDataSource } from "./data-source";
import { PostReport } from "./entity/PostReport";
import { Hashtag } from "./entity/Hashtag";
import { PostToParentMapping } from "./entity/PostToParentMapping";
import { isFriendOf, isMutualOf } from "./utils/followInfo";
import { likingUsersSQB, replyMappingsSQB, repostingUsersSQB } from "./utils/post";
import { DMSession } from "./entity/DMSession";

export async function initialize() {
    await AppDataSource.initialize()
}



// users

export async function getUserByGoogleID(googleid: string) {
    return await AppDataSource
        .getRepository(User)
        .findOneBy({ googleid })
}

export async function getUserByUsername(username: string) {
    return await AppDataSource
        .getRepository(User)
        .findOneBy({ username })
}

export type DeleteUserResult = {
    avatarFilename: string
    mediaPostIds: string[]
}
export async function deleteUser(googleid: string) {
    const result: DeleteUserResult = {
        avatarFilename: undefined,
        mediaPostIds: undefined
    }

    await doTransaction(async (em) => {
        const user = await em
            .getRepository(User)
            .findOneBy({ googleid })

        result.avatarFilename = user.avatar

        // decrement related users' followerCount, followingCount, mutualCount

        result.mediaPostIds = await em.getRepository(Post)
            .createQueryBuilder('post')
            .select("post.id")
            .where("post.author = :userId", { userId: user.id })
            .andWhere("post.media IS NOT NULL")
            .getMany()
            .then((posts) => posts.map((post) => post.id))

        await AppDataSource.getRepository(User).remove(user)
    })

    return result
}

export async function createOrUpdateAccountHelper(
    userId: string, // is null if this is account creation
    googleid: string,
    username: string,
    bio: string,
    shortBio: string,
    hasAvatarUpload: boolean
) {
    let user: User
    if (userId) {
        // already exists
        user = await AppDataSource.getRepository(User).findOneBy({ id: userId })
    } else {
        await doTransaction(async (em: EntityManager) => {
            const userLimitExceeded = await em.count(User) === consts.MAX_USERS
            if (userLimitExceeded) {
                throw new Error("User limit exceeded.")
            }
            user = new User()
            user.googleid = googleid
            if (await em.exists(User, { where: { username } })) {
                throw new Error(`username/Unable to set username: ${username} is already taken.`)
            } else {
                user.username = username
            }
        })
    }

    user.bio = bio
    user.shortBio = shortBio

    user = await AppDataSource.getRepository(User).save(user)

    if (hasAvatarUpload) {
        user.avatar = user.id + '_avatar'
        await AppDataSource.getRepository(User).save(user)
    }
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

export async function getUserAvatar(googleid: string) {
    return AppDataSource.getRepository(User).findOneBy({
        googleid
    }).then((user) => user.avatar)
}



// posts

export async function postOrReply(
    googleid: string,
    message: string,
    hasAttachedMedia: boolean,
    visibility: VisibilityType,
    visibilityPerspectiveGoogleId: string,
    parentPostIds: string[], // nullable
    hashtags: string[]
): Promise<Post> {
    const userPostCount = await AppDataSource.getRepository(Post).count({
        where: { author: { googleid } }
    })
    if (userPostCount >= consts.MAX_POSTS_PER_USER) {
        throw new Error("Max number of posts per user exceeded.")
    }

    let newPost: Post

    newPost = new Post()
    const user = await getUserByGoogleID(googleid)
    newPost.author = user

    const [previewSubstring, extensionSubstring] = getPreviewSubstring(message)
    newPost.body = previewSubstring
    newPost.extension = extensionSubstring

    newPost.visibility = visibility
    newPost.visibilityPerspective = await getUserByGoogleID(visibilityPerspectiveGoogleId)

    if (hasAttachedMedia) {
        newPost.media = newPost.id + '_media'
    }

    newPost = await AppDataSource.getRepository(Post).save(newPost)

    await doTransaction(async (em) => {
        const newTags: Hashtag[] = []
        const affectedExistingTags: Hashtag[] = []

        for (const tagString of hashtags) {
            // build a list of live hashtags

            const tag = await em.getRepository(Hashtag).findOne({
                where: { tag: tagString }
            })
            if (!tag) {
                const newTag = new Hashtag()
                newTag.tag = tagString
                newTag.posts = [newPost]
                newTags.push(newTag)
            } else {
                affectedExistingTags.push(tag)
            }
        }

        await em.getRepository(Hashtag).save(newTags)

        if (affectedExistingTags.length > 0) {
            for (const existingTag of affectedExistingTags) {
                await em
                    .createQueryBuilder()
                    .relation(Hashtag, 'posts')
                    .of(existingTag.id)
                    .add(newPost.id)
            }
        }
    })

    if (parentPostIds) {
        const parentPostMappings = []
        for (const parentPostId of parentPostIds) {
            const newMapping = new PostToParentMapping()
            newMapping.post = newPost
            newMapping.parent = await getPostByID(parentPostId)
            parentPostMappings.push(newMapping)
        }
        await AppDataSource.getRepository(PostToParentMapping).save(parentPostMappings)
    }

    return newPost
}

function getPreviewSubstring(message: string) {
    if (!message) {
        return [null, null]
    }
    let extensionStartIndex = message.length > consts.MAX_POST_PREVIEW_LENGTH ? consts.MAX_POST_PREVIEW_LENGTH : -1
    const tentativePreview = message.substring(0, consts.MAX_POST_PREVIEW_LENGTH)
    if ((tentativePreview.match(/\n/g) || []).length >= consts.MAX_POST_PREVIEW_LINES) {
        let newLineOccurrences = 0
        for (let i = 0; i < message.length; i++) {
            if (message[i] === '\n') {
                newLineOccurrences++
                if (newLineOccurrences === consts.MAX_POST_PREVIEW_LINES) {
                    extensionStartIndex = i
                    break
                }
            }
        }
    }
    return [
        extensionStartIndex === -1 ? message : message.substring(0, extensionStartIndex),
        extensionStartIndex === -1 ? null : message.substring(extensionStartIndex)]
}

export async function postOrReplyHook(
    newPost: Post,
    parentPostIds: string[] // nullable
) {
    if (parentPostIds) {
        for (const postId of parentPostIds) {
            const postAuthor = (await getPostByID(postId)).author
            await makeNotification(
                postAuthor,
                NotificationType.REPLY,
                newPost,
                newPost.author
            )
        }
    }
    await makeFeedActivity(
        newPost.author,
        newPost,
        FeedActivityType.POST
    )
}

// make sure the media is cleared from storage first
export async function deletePost(post: Post) {
    await AppDataSource.getRepository(Post).remove(post)
}



// post viewing

export async function getParentPostPromisesByMappingIds(ids: string[]) {
    return ids.map(async (mappingId) => {
        const maybeMapping: PostToParentMapping = await AppDataSource
            .getRepository(PostToParentMapping)
            .createQueryBuilder('mapping')
            .innerJoinAndSelect('mapping.parent', 'parent')
            .where('mapping.id = :mappingId', { mappingId })
            .getOne()
        if (maybeMapping) {
            return await AppDataSource.getRepository(Post).findOneBy({ id: maybeMapping.parent.id })
        } else {
            return null
        }
    })
}

export async function getIsPostVisible(viewerGoogleId: string, post: Post) {
    const visibility = post.visibility
    if (visibility === VisibilityType.EVERYONE) {
        return true
    }
    if (visibility === VisibilityType.MUTUALS) {
        return await isMutualOf(viewerGoogleId, post.visibilityPerspective)
    }
    if (visibility === VisibilityType.FRIENDS) {
        return await isFriendOf(viewerGoogleId, post.visibilityPerspective)
    }
}

export async function getPostMetadata(post: Post) {
    const numReplies = await replyMappingsSQB(post.id).getCount()
    const numLikes = await likingUsersSQB(post.id).getCount()
    const numReposts = await repostingUsersSQB(post.id).getCount()
    return [numReplies, numLikes, numReposts]
}

export async function getPostActivityFromUser(googleId: string, post: Post) {
    const liked = (await likingUsersSQB(post.id)
        .andWhere("liking.googleid = :googleId", { googleId })
        .getOne()) ? true : false
    const reposted = (await repostingUsersSQB(post.id)
        .andWhere("reposter.googleid = :googleId", { googleId })
        .getOne()) ? true : false
    return [liked, reposted]
}



// reports

export async function reportPost(
    post: Post,
    reporter: User
) {
    let reportStatus: string

    if (post.visibility !== VisibilityType.EVERYONE) {
        reportStatus = "Only posts visibile to everyone can be flagged."
        return reportStatus
    }

    reportStatus = "Post flagged - action will be taken if it is found to violate our terms of service."
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const report = new PostReport()
    report.post = post
    report.reporter = reporter
    const date = new Date()
    date.setDate(date.getDate() + consts.REPORT_EXPIRY_DAYS)
    report.expiryDate = date

    await AppDataSource.manager.transaction(
        "SERIALIZABLE",
        async (em) => {
            if (await em
                .getRepository(PostReport)
                .createQueryBuilder("report")
                .innerJoin("report.reporter", "reporter")
                .where("reporter.id = :reporterId", { reporterId: reporter.id })
                .andWhere("report.reportTime >= :oneHourAgo", { oneHourAgo })
                .getCount() < consts.MAX_REPORTS_PER_HOUR
            ) {
                reportStatus = `Post flagging is capped at ${consts.MAX_REPORTS_PER_HOUR} an hour.`
                return
            }

            if (await em
                .getRepository(PostReport)
                .createQueryBuilder("report")
                .innerJoin("report.post", "post", "post.id = postId", { postId: post.id })
                .getCount() > 0
            ) {
                reportStatus = `This post has already been flagged - action will be taken if it is found to violate our terms of service.`
                return
            }

            await em.getRepository(PostReport).save(report)
        }
    )

    return reportStatus
}

export async function takeActionOnReportHook(report: PostReport) {
    await makeNotification(report.reportee, NotificationType.ACTION_TAKEN, null, null)
}

export async function dismissReport(report: PostReport) {
    await AppDataSource.getRepository(PostReport).remove(report)
}



// likes

export async function likePost(userId: string, postId: string) {
    await handleLikePost(userId, postId, true)
}

export async function unlikePost(userId: string, postId: string) {
    await handleLikePost(userId, postId, false)
}

export async function likePostHook(user: User, post: Post, action: boolean) {
    if (user.id !== post.author.id) {
        await makeNotification(
            post.author,
            NotificationType.LIKE,
            post,
            user,
            action
        )
    }
    return await makeFeedActivity(
        user,
        post,
        FeedActivityType.LIKE,
        action
    )
}

async function handleLikePost(userId: string, postId: string, action: boolean) {
    await doTransaction(async (em) => {
        const exists = await em
            .getRepository(Post)
            .createQueryBuilder('post')
            .innerJoinAndSelect('post.likedBy', 'likingUser')
            .where('post.id = :postId', { postId })
            .andWhere('likingUser.id = :userId', { userId })
            .getExists()

        if (action && !exists) {
            await em
                .createQueryBuilder()
                .relation(Post, 'likedBy')
                .of(postId)
                .add(userId)
        } else if (!action && exists) {
            await em
                .createQueryBuilder()
                .relation(Post, 'likedBy')
                .of(postId)
                .remove(userId)
        }
    })
}



// reposts

export async function repostPost(userId: string, postId: string) {
    await handleRepostPost(userId, postId, true)
}

export async function unrepostPost(userId: string, postId: string) {
    await handleRepostPost(userId, postId, false)
}

export async function repostHook(user: User, post: Post, action: boolean) {
    await makeNotification(
        post.author,
        NotificationType.REPOST,
        post,
        user,
        action
    )
    await makeFeedActivity(
        user,
        post,
        FeedActivityType.REPOST,
        action
    )
}

export async function handleRepostPost(userId: string, postId: string, action: boolean) {
    await doTransaction(async (em) => {
        const exists = await em
            .getRepository(Post)
            .createQueryBuilder('post')
            .innerJoinAndSelect('post.reposters', 'repostingUser')
            .where('post.id = :postId', { postId })
            .andWhere('repostingUser.id = :userId', { userId })
            .getExists()

        if (action && !exists) {
            await em
                .createQueryBuilder()
                .relation(Post, 'reposters')
                .of(postId)
                .add(userId)
        } else if (!action && exists) {
            await em
                .createQueryBuilder()
                .relation(Post, 'reposters')
                .of(postId)
                .remove(userId)
        }
    })
}



// follows

export async function follow(userGoogleId: string, targetUserId: string) {
    await handleFollow(userGoogleId, targetUserId, true)
}

export async function unfollow(userGoogleId: string, targetUserId: string) {
    await handleFollow(userGoogleId, targetUserId, false)
}

export async function followHook(sourceUserGoogleId: string, targetUserId: string, action: boolean) {
    await makeNotification(
        await AppDataSource.getRepository(User).findOneBy({ id: targetUserId }),
        NotificationType.FOLLOW,
        null,
        await AppDataSource.getRepository(User).findOneBy({ googleid: sourceUserGoogleId }),
        action
    )
}

async function handleFollow(sourceUserGoogleId: string, targetUserId: string, action: boolean) {
    await doTransaction(async (em) => {
        const [loadedSourceUser, loadedTargetUser] = await checkRelation(sourceUserGoogleId, targetUserId, action, em)

        let mutualDelta = 0
        if (action) {
            if (!loadedSourceUser.following.some((user) => user.id === targetUserId)) {
                loadedSourceUser.following.push(loadedTargetUser)
                loadedSourceUser.followingCount += 1
                loadedTargetUser.followerCount += 1
                if (await isFollower(sourceUserGoogleId, targetUserId, em)) {
                    mutualDelta = 1
                }
            }
        } else {
            if (loadedSourceUser.following.some((user) => user.id === targetUserId)) {
                loadedSourceUser.following = loadedSourceUser.following.filter((user) => user.id !== targetUserId)
                loadedSourceUser.followingCount -= 1
                loadedTargetUser.followerCount -= 1
                if (await isFollower(sourceUserGoogleId, targetUserId, em)) {
                    mutualDelta = -1
                }
            }

            // remove friend
            loadedSourceUser.friends = loadedSourceUser.friends.filter((user) => user.id !== targetUserId)
            loadedTargetUser.friends = loadedTargetUser.friends.filter((user) => user.id !== loadedSourceUser.id)
        }
        loadedSourceUser.mutualCount += mutualDelta
        loadedTargetUser.mutualCount += mutualDelta

        await em.save(User, loadedTargetUser)
        await em.save(User, loadedSourceUser)
    })
}

async function isFollower(sourceUserGoogleId: string, potentialFollowerId: string, em: EntityManager) {
    return await em
        .getRepository(User)
        .createQueryBuilder('user')
        .innerJoinAndSelect('user.followers', 'follower')
        .where('user.googleid = :sourceUserGoogleId', { sourceUserGoogleId })
        .andWhere('follower.id = :potentialFollowerId', { potentialFollowerId })
        .getExists()
}

export async function getFollowRelationship(googleid: string, targetUserId: string) {
    const sourceUser = await AppDataSource.getRepository(User).findOne({
        where: { googleid },
        relations: {
            following: true,
            friends: true
        }
    })
    if (!sourceUser) {
        throw new Error("User not found.")
    }

    const following = sourceUser.following.some((user) => user.id === targetUserId)
    const followedBy = await AppDataSource
        .getRepository(User)
        .findOne({
            where: { id: targetUserId },
            relations: {
                following: true
            }
        })
        .then((user) => user.following.some((followed) => followed.googleid === googleid))
    const friend = sourceUser.friends.some((user) => user.id === targetUserId)

    return { following, followedBy, friend }
}



// friending

export async function friend(userGoogleId: string, targetUserId: string) {
    await handleFriend(userGoogleId, targetUserId, true)
}

export async function unfriend(userGoogleId: string, targetUserId: string) {
    await handleFriend(userGoogleId, targetUserId, false)
}

export async function friendHook(sourceUserGoogleId: string, targetUserId: string, action: boolean) {
    await makeNotification(
        await AppDataSource.getRepository(User).findOneBy({ id: targetUserId }),
        NotificationType.FRIENDING,
        null,
        await AppDataSource.getRepository(User).findOneBy({ googleid: sourceUserGoogleId }),
        action
    )
}

export async function getFriends(googleid: string) {
    const loadedUser = await AppDataSource.getRepository(User).findOne({
        relations: { friends: true },
        where: { googleid }
    })
    return loadedUser.friends.sort((a, b) => {
        return a.username.localeCompare(b.username)
    }).map((user) => user.username)
}

export async function getBefriendedBy(googleid: string) {
    const loadedUser = await AppDataSource.getRepository(User).findOne({
        relations: { befriendedBy: true },
        where: { googleid }
    })
    return loadedUser.befriendedBy.sort((a, b) => {
        return a.username.localeCompare(b.username)
    }).map((user) => user.username)
}

async function handleFriend(sourceUserGoogleId: string, targetUserId: string, action: boolean) {
    await doTransaction(async (em) => {
        const [loadedSourceUser, loadedTargetUser] = await checkRelation(sourceUserGoogleId, targetUserId, action, em)
        if (action) {
            if (
                await isFollower(sourceUserGoogleId, targetUserId, em)
                && loadedSourceUser.following.some((user) => user.id === targetUserId)
            ) {
                // is a mutual
                if (!loadedSourceUser.friends.some((user) => user.id === targetUserId)) {
                    loadedSourceUser.friends.push(loadedTargetUser)
                }
            } else {
                // is not a mutual
                throw new Error("Failed to add this user as your friend - this can only be done to mutuals.")
            }
        } else {
            loadedSourceUser.friends = loadedSourceUser.friends.filter((user) => user.id !== targetUserId)
        }
        await em.save(User, loadedSourceUser)
    })
}



// blocks

export async function blockUser(userGoogleId: string, targetUserId: string) {
    await handleBlock(userGoogleId, targetUserId, true)
}

export async function unblockUser(userGoogleId: string, targetUserId: string) {
    await handleBlock(userGoogleId, targetUserId, false)
}

async function handleBlock(googleid: string, targetUserId: string, action: boolean) {
    const loadedSourceUser = await AppDataSource.getRepository(User).findOne({
        relations: {
            blockedUsers: true
        },
        where: { googleid }
    })
    let targetUserGoogleId: string
    if (action) {
        if (loadedSourceUser.blockedUsers.filter((user) => user.id === targetUserId).length === 0) {
            const targetUser = await AppDataSource.getRepository(User).findOneBy({ id: targetUserId })
            loadedSourceUser.blockedUsers.push(targetUser)
            targetUserGoogleId = targetUser.googleid
        }
    } else {
        loadedSourceUser.blockedUsers = loadedSourceUser.blockedUsers.filter((user) => user.id !== targetUserId)
    }
    await AppDataSource.getRepository(User).save(loadedSourceUser)
    if (action) {
        await unfollow(googleid, targetUserId)
        await unfollow(targetUserGoogleId, loadedSourceUser.id)
    }
}

export async function isBlocking(googleid: string, targetUserId: string) {
    const loadedUser = await AppDataSource.getRepository(User).findOne({
        relations: { blockedUsers: true },
        where: { googleid }
    })
    return loadedUser.blockedUsers.some((user) => user.id === targetUserId)
}

export async function isBlockedBy(googleid: string, targetUserId: string) {
    const loadedTargetUser = await AppDataSource.getRepository(User).findOne({
        relations: { blockedUsers: true },
        where: { id: targetUserId }
    })
    return loadedTargetUser.blockedUsers.some((user) => user.googleid === googleid)
}

export async function getBlocklist(googleid: string) {
    const loadedUser = await AppDataSource.getRepository(User).findOne({
        relations: { blockedUsers: true },
        where: { googleid }
    })
    return loadedUser.blockedUsers.sort((a, b) => {
        return a.username.localeCompare(b.username)
    }).map((user) => user.username)
}



// DMs

// message is checked for length beforehand
export async function sendDMAndReturnSession(dmSender: User, dmRecipient: User, message: string) {
    let session: DMSession
    await doTransaction(async (em) => {
        const maybeDmSession = await em
            .getRepository(DMSession)
            .createQueryBuilder('session')
            .where((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select("subSession.id")
                    .from(DMSession, 'subSession')
                    .innerJoin('subSession.participant1', 'participant1', 'participant1.id = :senderId', { senderId: dmSender.id })
                    .innerJoin('subSession.participant2', 'participant2', 'participant2.id = :recipientId', { recipientId: dmRecipient.id })
                    .getQuery()
                return "session.id = " + subQuery
            })
            .orWhere((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select("subSession1.id")
                    .from(DMSession, 'subSession1')
                    .innerJoin('subSession1.participant1', 'participant1_1', 'participant1_1.id = :recipientId', { recipientId: dmRecipient.id })
                    .innerJoin('subSession1.participant2', 'participant2_1', 'participant2_1.id = :senderId', { senderId: dmSender.id })
                    .getQuery()
                return "session.id = " + subQuery
            })
            .getOne()

        if (maybeDmSession) {
            session = maybeDmSession
        } else {
            const newSession = new DMSession()
            newSession.participant1 = dmSender
            newSession.participant2 = dmRecipient
            session = await em.getRepository(DMSession).save(newSession)
        }
    })

    if (!session) {
        throw new Error("Unable to assign DM session")
    }

    const dm = new DM()
    dm.dmSession = session
    dm.sender = dmSender
    dm.message = message
    await AppDataSource.getRepository(DM).save(dm)

    return session
}

export async function processSessionPostDM(dmSession: DMSession) {
    const dmQueryBuilder = AppDataSource
        .getRepository(DM)
        .createQueryBuilder('dm')
        .innerJoin('dm.dmSession', 'session', 'session.id = :sessionId', { sessionId: dmSession.id })

    const count = await dmQueryBuilder.getCount()

    if (count > consts.NUMBER_OF_RETRIEVABLE_DM_S) {
        const earliests = await dmQueryBuilder
            .orderBy('dm.createTime', 'ASC')
            .take(count - consts.NUMBER_OF_RETRIEVABLE_DM_S)
            .getMany()
        await AppDataSource.getRepository(DM).remove(earliests)
    }

    const lastUpdate = await dmQueryBuilder
        .orderBy('dm.createTime', 'DESC')
        .getOne()
        .then((dm) => dm.createTime)
    
    dmSession.lastUpdate = lastUpdate
    await AppDataSource.getRepository(DMSession).save(dmSession)
}

export async function getUserDMSessions(user: User) {
    return await AppDataSource
        .getRepository(DMSession)
        .createQueryBuilder('session')
        .leftJoin('session.participant1', 'participant1')
        .leftJoin('session.participant2', 'participant2')
        .where('participant1.id = :userId OR participant2.id = :userId', { userId: user.id })
        .getMany()
}

export async function getOneOnOneDMs(dmSession: DMSession) {
    return await AppDataSource
        .getRepository(DM)
        .createQueryBuilder('dm')
        .innerJoin('dm.dmSession', 'session', 'session.id = :sessionId', { sessionId: dmSession.id })
        .leftJoinAndSelect('dm.sender', 'sender')
        .orderBy('dm.createTime', 'DESC')
        .getMany()
}

export async function deleteDM(dm: DM) {
    await AppDataSource.getRepository(DM).update(
        { id: dm.id },
        { message: "[Deleted message]" }
    )
}

export async function cleanupDeletedUserDMs(googleid: string) {
    const sessionsToDelete = await AppDataSource
        .getRepository(DMSession)
        .createQueryBuilder('session')
        .where((qb) => {
            // user is session's participant1
            const subQuery = qb
                .subQuery()
                .select('p1Session.id')
                .from(DMSession, 'p1Session')
                .innerJoin('p1Session.participant1', 'participant1', 'participant1.googleid = :googleid', { googleid })
                .where((qb1) => {
                    // p1session has no participant2
                    const subQuery = qb1
                        .subQuery()
                        .select('subP1Session.id')
                        .from(DMSession, 'subP1Session')
                        .innerJoin('subP1Session.participant1', 'subParticipant1', 'subParticipant1.googleid = :googleid', { googleid })
                        .innerJoin('subP1Session.participant2', 'subParticipant2')
                        .getQuery()
                    return 'p1Session.id NOT IN ' + subQuery
                })
                .getQuery()
            return 'session.id IN ' + subQuery
        })
        .orWhere((qb) => {
            // user is session's participant2
            const subQuery = qb
                .subQuery()
                .select('p2Session.id')
                .from(DMSession, 'p2Session')
                .innerJoin('p2Session.participant2', 'participant2', 'participant2.googleid = :googleid', { googleid })
                .where((qb1) => {
                    // p2session has no participant1
                    const subQuery = qb1
                        .subQuery()
                        .select('subP2Session.id')
                        .from(DMSession, 'subP2Session')
                        .innerJoin('subP2Session.participant2', 'subParticipant2', 'subParticipant2.googleid = :googleid', { googleid })
                        .innerJoin('subP2Session.participant1', 'subParticipant1')
                        .getQuery()
                    return 'p2Session.id NOT IN ' + subQuery
                })
                .getQuery()
            return 'session.id IN ' + subQuery
        })
        .getMany()

    await AppDataSource.getRepository(DMSession).remove(sessionsToDelete)
}



// Utility



// action comes into play as false when a user unfollows, unlikes, or unreposts
async function makeNotification(
    user: User,
    type: NotificationType,
    sourcePost: Post | null,
    sourceUser: User | null,
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
        await AppDataSource.getRepository(Notification).save(notification)
    } else {
        let whereClause: FindOptionsWhere<Notification>
        if (!sourcePost && !sourceUser) {
            whereClause = {
                user: { id: user.id },
                type,
            }
        } else if (sourcePost && sourceUser) {
            whereClause = {
                user: { id: user.id },
                type,
                sourcePost: { id: sourcePost.id },
                sourceUser: { id: sourceUser.id }
            }
        } else if (sourcePost) {
            whereClause = {
                user: { id: user.id },
                type,
                sourcePost: { id: sourcePost.id },
            }
        } else {
            whereClause = {
                user: { id: user.id },
                type,
                sourceUser: { id: sourceUser.id }
            }
        }
        const notifToDelete = await AppDataSource.getRepository(Notification).findOne({
            where: whereClause,
        })
        await AppDataSource.getRepository(Notification).remove(notifToDelete)
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
        const savedFA = await AppDataSource.getRepository(FeedActivity).save(feedActivity)
    } else {
        await AppDataSource.getRepository(FeedActivity).delete({
            sourceUser, sourcePost, type
        })
    }
}

export async function getPostByID(id: string) {
    return await AppDataSource.getRepository(Post).findOne({
        where: { id }
    })
}

export async function doTransaction<T>(transactionCall: (
    entityManager: EntityManager) => Promise<T>
) {
    return await AppDataSource.manager.transaction(
        "SERIALIZABLE",
        async (transactionEntityManager: EntityManager) => {
            return await transactionCall(transactionEntityManager)
        }
    )
}

// check if following and friending is valid
async function checkRelation(sourceUserGoogleId: string, targetUserId: string, action: boolean, em: EntityManager) {
    const loadedSourceUser = await em.findOne(User, {
        relations: {
            following: true,
            friends: true,
            blockedUsers: true
        },
        where: { googleid: sourceUserGoogleId }
    })
    if (!loadedSourceUser) {
        throw new Error("Unable to retrieve user using token.")
    }
    const loadedTargetUser = await em.findOne(User, {
        relations: {
            friends: true,
            blockedUsers: true
        },
        where: { id: targetUserId }
    })
    if (!loadedTargetUser) {
        throw new Error("Unable to retrieve user by ID.")
    }
    if (action && loadedTargetUser.blockedUsers.some((user) => user.googleid === sourceUserGoogleId)) {
        throw new Error("Unable to follow - source user is blocked.")
    }
    if (action && loadedSourceUser.blockedUsers.some((user) => user.id === targetUserId)) {
        throw new Error("Unable to follow - target user is blocked.")
    }

    return [loadedSourceUser, loadedTargetUser]
}



// testing

export async function getFollowersDEBUGONLY(user: User): Promise<User[]> {
    return await AppDataSource
        .getRepository(User)
        .findOne({
            relations: { followers: true },
            where: { id: user.id }
        })
        .then((user) => user.followers)
}

export async function getFollowingDEBUGONLY(user: User) {
    return AppDataSource.getRepository(User).findOne({
        where: { id: user.id },
        relations: {
            following: true
        }
    }).then((user) => user.following)
}

export async function getPostLikesDEBUGONLY(post: Post) {
    return AppDataSource.getRepository(Post).findOne({
        where: { id: post.id },
        relations: {
            likedBy: true
        }
    }).then((thisPost) => thisPost.likedBy)
}

export async function getPostRepostsDEBUGONLY(post: Post) {
    return AppDataSource.getRepository(Post).findOne({
        where: { id: post.id },
        relations: {
            reposters: true
        }
    }).then((thisPost) => thisPost.reposters)
}

export async function getNotificationDEBUGONLY(
    user: User,
    type: NotificationType,
    sourcePost: Post | null,
    sourceUser: User | null
) {
    let whereClause: FindOptionsWhere<Notification>
    if (!sourcePost && !sourceUser) {
        whereClause = {
            user: { id: user.id },
            type,
        }
    } else if (sourcePost && sourceUser) {
        whereClause = {
            user: { id: user.id },
            type,
            sourcePost: { id: sourcePost.id },
            sourceUser: { id: sourceUser.id }
        }
    } else if (sourcePost) {
        whereClause = {
            user: { id: user.id },
            type,
            sourcePost: { id: sourcePost.id },
        }
    } else {
        whereClause = {
            user: { id: user.id },
            type,
            sourceUser: { id: sourceUser.id }
        }
    }
    return await AppDataSource.getRepository(Notification).findOne({
        where: whereClause
    })
}

export async function getFeedActivityDEBUGONLY(
    sourceUser: User,
    sourcePost: Post,
    type: FeedActivityType
) {
    const feedActivityId = await AppDataSource
        .getRepository(FeedActivity)
        .createQueryBuilder('activity')
        .innerJoinAndSelect('activity.sourceUser', 'sourceUser')
        .innerJoinAndSelect('activity.sourcePost', 'sourcePost')
        .where('activity.type = :type', { type })
        .andWhere('activity.sourceUser = :sourceUserId', { sourceUserId: sourceUser.id })
        .andWhere('activity.sourcePost = :sourcePostId', { sourcePostId: sourcePost.id })
        .getOne()
        .then((activity) => activity.id)
        .catch((_) => null)
    if (!feedActivityId) {
        return feedActivityId
    }
    return await AppDataSource.getRepository(FeedActivity).findOneBy({ id: feedActivityId })
}

export async function getAllGoogleIDsForDeletionDEBUGONLY() {
    return await AppDataSource
        .getRepository(User)
        .find()
        .then((users) => users.map((user) => user.googleid))
}

export async function getLatestDMFromSessionDEBUGONLY(dmSession: DMSession) {
    return await AppDataSource
        .getRepository(DM)
        .createQueryBuilder('dm')
        .innerJoin('dm.dmSession', 'session', 'session.id = :sessionId', { sessionId: dmSession.id })
        .orderBy('dm.createTime', 'DESC')
        .getOne()
}

export async function getAllDMSessionsDEBUGONLY() {
    return await AppDataSource.getRepository(DMSession).find({
        relations: {
            participant1: true,
            participant2: true
        }
    })
}

export async function getCompleteDMSessionDEBUGONLY(dmSession: DMSession) {
    return await AppDataSource.getRepository(DMSession).findOne({
        where: { id : dmSession.id },
        relations: {
            participant1: true,
            participant2: true
        }
    })
}

export async function clearDMsDEBUGONLY() {
    const DMs = await AppDataSource.getRepository(DM).find()
    await AppDataSource.getRepository(DM).remove(DMs)
}

export async function clearHashtagsDEBUGONLY() {
    const hashtags = await AppDataSource.getRepository(Hashtag).find()
    await AppDataSource.getRepository(Hashtag).remove(hashtags)
}