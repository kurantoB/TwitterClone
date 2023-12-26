import * as Persistence from './persistence'
import { User } from "./entity/User"
import { Notification, NotificationType } from "./entity/Notification"
import { FeedActivity, FeedActivityType } from "./entity/FeedActivity"
import consts from "./consts"
import { Post, VisibilityType } from './entity/Post'
import { DM } from './entity/DM'
import { clearDB } from './index'
import { cleanupDeletedUser } from './utils/account'
import { DMSession } from './entity/DMSession'
import { assert } from 'console'
import { storeMedia } from './utils/general'
import https, { RequestOptions } from 'https'
import { IncomingHttpHeaders } from 'http'

export async function testDB2() {
}

const doLogging = true
function conditionalLog(msg: string) {
    if (doLogging) {
        console.log(`\n${msg}`)
    }
}

const mediaReqPromise = (url: string) => new Promise<IncomingHttpHeaders>((resolve) => {
    const options: RequestOptions = {
        method: 'GET',
        headers: { 'Content-Type': 'image/*' }
    }
    const req = https.request(url, options, res => {
        res.on('data', () => {
            const { headers } = res
            resolve(headers)
        })
    })
    req.end()
})

export default async function testDB() {
    const kurantoBGoogleId = "113542394053227098585"
    const kurantoNoMichiGoogleId = "113011160176295257673";
    const dummyUserID = "dummygoogleid"

    const toPrintableUser = (user: User) => {
        return user ? {
            username: user.username,
            googleid: user.googleid
        } : user
    }

    const toPrintableUsers = (users: User[]) => {
        return users.map((user) => {
            return {
                username: user.username,
                googleid: user.googleid
            }
        })
    }

    const toPrintableNotif = (notif: Notification) => {
        return notif ? {
            user: notif.user.googleid,
            type: notif.type,
            sourcePost: notif.sourcePost?.id,
            sourceUser: notif.sourceUser?.googleid
        } : notif
    }

    const toPrintablePost = (post: Post) => {
        return post ? {
            id: post.id,
            author: post.author.googleid,
            body: post.body,
            extension: post.extension,
        } : post
    }

    const toPrintableFeedActivity = (activity: FeedActivity) => {
        return activity ? {
            sourceUser: activity.sourceUser.googleid,
            sourcePost: activity.sourcePost.id,
            type: activity.type
        } : activity
    }

    const toPrintableDMSession = (dmSession: DMSession) => {
        return dmSession ? {
            participant1: toPrintableUser(dmSession.participant1),
            participant2: toPrintableUser(dmSession.participant2)
        } : dmSession
    }

    let kurantoB: User
    let kurantoNoMichi: User
    let dummyUser: User

    conditionalLog(">> USER")

    await clearDB()
    assert(await Persistence.checkDBEmptyDEBUGONLY(), "DB not cleared")

    await Persistence.createOrUpdateAccountHelper(null, kurantoBGoogleId, "kurantoB", "", "", true)
    kurantoB = await Persistence.getUserByGoogleID(kurantoBGoogleId)
    const avatarFilename = `${kurantoB.id}_avatar`
    await storeMedia(
        consts.CLOUD_STORAGE_AVATAR_BUCKETNAME,
        "C:\\Users\\Dennis\\My Art\\selfPortrait.png",
        avatarFilename
    )

    conditionalLog("  >> GET USER")

    kurantoB = await Persistence.getUserByGoogleID(kurantoBGoogleId)
    assert(kurantoB, "Unable to load user")
    assert(kurantoB.avatar === `${kurantoB.id}_avatar`)
    const avatarURL = `${consts.CLOUD_STORAGE_ROOT}/${consts.CLOUD_STORAGE_AVATAR_BUCKETNAME}/${kurantoB.id}_avatar`
    const resHeaders = await mediaReqPromise(avatarURL)
    assert(parseInt(resHeaders['content-length']) > 0, "Response header content-length expected to be greater than 0")

    let errorReached = false
    try {
        await Persistence.createOrUpdateAccountHelper(null, kurantoBGoogleId, null, "", "", false)
    } catch (error) {
        errorReached = true
    }
    assert(errorReached, "Expected error when reinserting user")

    conditionalLog("  >> EDIT USER")

    await Persistence.createOrUpdateAccountHelper(kurantoB.id, kurantoBGoogleId, null, "A bio", "A short bio", false)
    kurantoB = await Persistence.getUserByGoogleID(kurantoBGoogleId)
    assert(kurantoB.bio === "A bio" && kurantoB.shortBio === "A short bio", "Expected updated user bio and short bio")

    conditionalLog("  >> DELETE USER")

    const delResult0 = await Persistence.deleteUser(kurantoBGoogleId)
    await cleanupDeletedUser(delResult0)
    const deleteUserGetResult = await Persistence.getUserByGoogleID(kurantoBGoogleId)
    assert(!deleteUserGetResult, "Expected empty query results after user deletion")

    await clearDB()
    assert(await Persistence.checkDBEmptyDEBUGONLY(), "DB not cleared")

    await Persistence.createOrUpdateAccountHelper(null, kurantoBGoogleId, "kurantoB", "", "", false)
    kurantoB = await Persistence.getUserByGoogleID(kurantoBGoogleId)

    await Persistence.createOrUpdateAccountHelper(null, kurantoNoMichiGoogleId, "kurantonomichi", "", "", false)
    kurantoNoMichi = await Persistence.getUserByGoogleID(kurantoNoMichiGoogleId)

    conditionalLog(">> FOLLOW")

    await Persistence.follow(kurantoNoMichiGoogleId, kurantoB.id)
    let postUserFollowers = await Persistence.getFollowersDEBUGONLY(kurantoB)
    assert(postUserFollowers.length === 1 && postUserFollowers[0].googleid === kurantoNoMichiGoogleId, "Post user follower not as expected")
    kurantoB = await Persistence.getUserByGoogleID(kurantoBGoogleId)
    assert(kurantoB.followerCount === 1 && kurantoB.followingCount === 0 && kurantoB.mutualCount === 0, "Post user followers/following/mutual is not 1/0/0")
    const followerUserFollowing = await Persistence.getFollowingDEBUGONLY(kurantoNoMichi)
    assert(followerUserFollowing.length === 1 && followerUserFollowing[0].googleid === kurantoBGoogleId, "Following user following not as expected")
    kurantoNoMichi = await Persistence.getUserByGoogleID(kurantoNoMichiGoogleId)
    assert(kurantoNoMichi.followerCount === 0 && kurantoNoMichi.followingCount === 1 && kurantoNoMichi.mutualCount === 0, "Following user followers/following/mutual is not 0/1/0")
    await Persistence.followHook(kurantoNoMichiGoogleId, kurantoB.id, true)
    let followNotif = await Persistence.getNotificationDEBUGONLY(kurantoB, NotificationType.FOLLOW, null, kurantoNoMichi)
    assert(followNotif
        && followNotif.user && followNotif.user.googleid === kurantoBGoogleId
        && followNotif.type === NotificationType.FOLLOW
        && followNotif.sourceUser && followNotif.sourceUser.googleid === kurantoNoMichiGoogleId,
        "Follow notification does not match {user=post user, type=follow, sourceUser=following user}"
    )

    conditionalLog("  >> FOLLOW BACK")

    await Persistence.follow(kurantoBGoogleId, kurantoNoMichi.id)
    kurantoB = await Persistence.getUserByGoogleID(kurantoBGoogleId)
    assert(kurantoB.followerCount === 1 && kurantoB.followingCount === 1 && kurantoB.mutualCount === 1, "Post user followers/following/mutual is not 1/1/1")
    kurantoNoMichi = await Persistence.getUserByGoogleID(kurantoNoMichiGoogleId)
    assert(kurantoNoMichi.followerCount === 1 && kurantoNoMichi.followingCount === 1 && kurantoNoMichi.mutualCount === 1, "Following user followers/following/mutual is not 1/1/1")
    await Persistence.followHook(kurantoBGoogleId, kurantoNoMichi.id, true)
    followNotif = await Persistence.getNotificationDEBUGONLY(kurantoNoMichi, NotificationType.FOLLOW, null, kurantoB)
    assert(
        followNotif
        && followNotif.user && followNotif.user.googleid === kurantoNoMichiGoogleId
        && followNotif.type === NotificationType.FOLLOW
        && followNotif.sourceUser && followNotif.sourceUser.googleid === kurantoBGoogleId,
        "Follow notification does not match {user=following user, type=follow, sourceUser=post user}"
    )

    conditionalLog("  >> UNFOLLOW BACK")

    await Persistence.unfollow(kurantoBGoogleId, kurantoNoMichi.id)
    kurantoB = await Persistence.getUserByGoogleID(kurantoBGoogleId)
    assert(kurantoB.followerCount === 1 && kurantoB.followingCount === 0 && kurantoB.mutualCount === 0, "Post user followers/following/mutual is not back to 1/0/0")
    kurantoNoMichi = await Persistence.getUserByGoogleID(kurantoNoMichiGoogleId)
    assert(kurantoNoMichi.followerCount === 0 && kurantoNoMichi.followingCount === 1 && kurantoNoMichi.mutualCount === 0, "Following user followers/following/mutual is not back to 0/1/0")
    await Persistence.followHook(kurantoBGoogleId, kurantoNoMichi.id, false)
    followNotif = await Persistence.getNotificationDEBUGONLY(kurantoNoMichi, NotificationType.FOLLOW, null, kurantoB)
    assert(!followNotif, "Expected empty follow notification after deletion")

    conditionalLog(">> FRIENDING")

    conditionalLog("  >> FRIENDING CONDITION")

    errorReached = false
    try {
        await Persistence.friend(kurantoBGoogleId, kurantoNoMichi.id)
    } catch (error) {
        errorReached = true
    }
    assert(errorReached, "Expected error when friending non-mutual")
    
    await Persistence.follow(kurantoBGoogleId, kurantoNoMichi.id)
    await Persistence.followHook(kurantoBGoogleId, kurantoNoMichi.id, true)
    await Persistence.friend(kurantoBGoogleId, kurantoNoMichi.id)
    let friends = await Persistence.getFriends(kurantoBGoogleId)
    assert(friends.length === 1 && friends[0] === kurantoNoMichi.username, "Following user expected to be post user's friend")
    await Persistence.friendHook(kurantoBGoogleId, kurantoNoMichi.id, true)
    let friendNotif = await Persistence.getNotificationDEBUGONLY(kurantoNoMichi, NotificationType.FRIENDING, null, kurantoB)
    assert(
        friendNotif
        && friendNotif.user && friendNotif.user.googleid === kurantoNoMichiGoogleId
        && friendNotif.type === NotificationType.FRIENDING
        && friendNotif.sourceUser && friendNotif.sourceUser.googleid === kurantoBGoogleId,
        "Friending notification does not match {user=following user, type=friending, sourceUser=post user}"
    )

    conditionalLog("  >> UNFRIENDING")

    await Persistence.unfriend(kurantoBGoogleId, kurantoNoMichi.id)
    friends = await Persistence.getFriends(kurantoBGoogleId)
    assert(friends.length === 0, "Post user friends expected to be empty")
    await Persistence.friendHook(kurantoBGoogleId, kurantoNoMichi.id, false)
    friendNotif = await Persistence.getNotificationDEBUGONLY(kurantoNoMichi, NotificationType.FRIENDING, null, kurantoB)
    assert(!friendNotif, "Expected empty friending notification after unfriending")

    conditionalLog("  >> AUTO UNFRIENDING")
    
    await Persistence.friend(kurantoBGoogleId, kurantoNoMichi.id)
    await Persistence.friendHook(kurantoBGoogleId, kurantoNoMichi.id, true)
    await Persistence.unfollow(kurantoBGoogleId, kurantoNoMichi.id)
    await Persistence.followHook(kurantoBGoogleId, kurantoNoMichi.id, false)
    friends = await Persistence.getFriends(kurantoBGoogleId)
    assert(friends.length === 0, "Post user friends expected to be empty")
    friendNotif = await Persistence.getNotificationDEBUGONLY(kurantoNoMichi, NotificationType.FRIENDING, null, kurantoB)
    assert(
        friendNotif
        && friendNotif.user && friendNotif.user.googleid === kurantoNoMichiGoogleId
        && friendNotif.type === NotificationType.FRIENDING
        && friendNotif.sourceUser && friendNotif.sourceUser.googleid === kurantoBGoogleId,
        "Friending notification does not match {user=following user, type=friending, sourceUser=post user}"
    )

    conditionalLog(">> BLOCK")

    conditionalLog("  >> BLOCK AUTO UNFOLLOW FOLLOWER")

    postUserFollowers = await Persistence.getFollowersDEBUGONLY(kurantoB)
    assert(postUserFollowers.length === 1 && postUserFollowers[0].googleid === kurantoNoMichiGoogleId, "Post user follower not as expected")
    await Persistence.blockUser(kurantoBGoogleId, kurantoNoMichi.id)
    await Persistence.blockUserHook(kurantoBGoogleId, kurantoNoMichi.id)
    let blockList = await Persistence.getBlocklist(kurantoBGoogleId)
    assert(blockList.length === 1 && blockList[0] === kurantoNoMichi.username, "Block list expected to be following user")
    let isBlockedBy = await Persistence.isBlockedBy(kurantoNoMichiGoogleId, kurantoB.id)
    assert(isBlockedBy, "Following user expected to be blocked by posting user")
    let isBlocking = await Persistence.isBlocking(kurantoBGoogleId, kurantoNoMichi.id)
    assert(isBlocking, "Posting user expected to be blocking following user")
    postUserFollowers = await Persistence.getFollowersDEBUGONLY(kurantoB)
    assert(postUserFollowers.length === 0, "Post user followers expected to be empty")

    conditionalLog("  >> UNBLOCK")

    await Persistence.unblockUser(kurantoBGoogleId, kurantoNoMichi.id)
    blockList = await Persistence.getBlocklist(kurantoBGoogleId)
    assert(blockList.length === 0, "Block list expected to be empty")
    isBlockedBy = await Persistence.isBlockedBy(kurantoNoMichiGoogleId, kurantoB.id)
    assert(!isBlockedBy, "Following user expected to be not blocked by posting user")
    isBlocking = await Persistence.isBlocking(kurantoBGoogleId, kurantoNoMichi.id)
    assert(!isBlocking, "Posting user expected to be not blocking following user")

    conditionalLog("  >> BLOCK AUTO UNFOLLOW FOLLOWING")

    await Persistence.follow(kurantoBGoogleId, kurantoNoMichi.id)
    let followingUserFollowers = await Persistence.getFollowersDEBUGONLY(kurantoNoMichi)
    assert(followingUserFollowers.length === 1 && followingUserFollowers[0].googleid === kurantoBGoogleId, "Following user follower not as expected")
    await Persistence.blockUser(kurantoBGoogleId, kurantoNoMichi.id)
    await Persistence.blockUserHook(kurantoBGoogleId, kurantoNoMichi.id)
    followingUserFollowers = await Persistence.getFollowersDEBUGONLY(kurantoNoMichi)
    assert(followingUserFollowers.length === 0, "Following user followers expected to be empty")

    conditionalLog("  >> UNBLOCK")

    await Persistence.unblockUser(kurantoBGoogleId, kurantoNoMichi.id)

    conditionalLog(">> POST")

    conditionalLog("  >> NEW POST")

    let newPost = await Persistence.postOrReply(kurantoBGoogleId, "Hello, this is a short post.", false, VisibilityType.EVERYONE, kurantoBGoogleId, null, [])
    await Persistence.postOrReplyHook(newPost, null)
    const newPostId = newPost.id
    newPost = await Persistence.getPostByID(newPostId)
    assert(newPost, "Failed to retrieve new post")
    let newPostFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoB, newPost, FeedActivityType.POST)
    assert(
        newPostFeedActivity
        && newPostFeedActivity.sourceUser && newPostFeedActivity.sourceUser.googleid === kurantoBGoogleId
        && newPostFeedActivity.sourcePost && newPostFeedActivity.sourcePost.id === newPost.id
        && newPostFeedActivity.type === FeedActivityType.POST,
        "New post feed activity does not match {sourceUser=posting user, sourcePost=new post, type=post}")
    newPost = await Persistence.getPostByID(newPost.id)
    let parentPostPromises: Promise<Post>[] = await Persistence.getParentPostPromisesByMappingIds(newPost.parentMappings.map((mapping) => mapping.id))
    assert(parentPostPromises.length === 0, "Parent posts expected to be empty")

    conditionalLog("  >> LIKE")

    await Persistence.likePost(kurantoNoMichi.id, newPost.id)
    let newPostLikes = await Persistence.getPostLikesDEBUGONLY(newPost)
    assert(newPostLikes.length === 1 && newPostLikes[0].googleid === kurantoNoMichiGoogleId, "New post like not as expected")
    await Persistence.likePostHook(kurantoNoMichi, newPost, true)
    let likeNotif = await Persistence.getNotificationDEBUGONLY(kurantoB, NotificationType.LIKE, newPost, kurantoNoMichi)
    assert(
        likeNotif
        && likeNotif.user && likeNotif.user.googleid === kurantoBGoogleId
        && likeNotif.type === NotificationType.LIKE
        && likeNotif.sourcePost && likeNotif.sourcePost.id === newPost.id
        && likeNotif.sourceUser && likeNotif.sourceUser.googleid === kurantoNoMichiGoogleId,
        "Like notification does not match {user=post user, type=like, sourcePost=new post, sourceUser=liking user}"
    )
    let likeFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoNoMichi, newPost, FeedActivityType.LIKE)
    assert(
        likeFeedActivity
        && likeFeedActivity.sourceUser && likeFeedActivity.sourceUser.googleid === kurantoNoMichiGoogleId
        && likeFeedActivity.sourcePost && likeFeedActivity.sourcePost.id === newPost.id
        && likeFeedActivity.type === FeedActivityType.LIKE,
        "Like feed activity does not match {sourceUser=liking user, sourcePost=new post, type=like}"
    )

    conditionalLog("  >> UNLIKE")

    await Persistence.unlikePost(kurantoNoMichi.id, newPost.id)
    newPostLikes = await Persistence.getPostLikesDEBUGONLY(newPost)
    assert(newPostLikes.length === 0, "New post likes expected to be empty")
    await Persistence.likePostHook(kurantoNoMichi, newPost, false)
    likeNotif = await Persistence.getNotificationDEBUGONLY(kurantoB, NotificationType.LIKE, newPost, kurantoNoMichi)
    assert(!likeNotif, "Like notification expected to be empty")
    likeFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoNoMichi, newPost, FeedActivityType.LIKE)
    assert(!likeFeedActivity, "Like feed activity expected to be empty")

    conditionalLog("  >> RE-LIKE")
    await Persistence.likePost(kurantoNoMichi.id, newPost.id)
    await Persistence.likePostHook(kurantoNoMichi, newPost, true)

    conditionalLog("  >> REPOST")

    await Persistence.repostPost(kurantoNoMichi.id, newPost.id)
    let newPostReposts = await Persistence.getPostRepostsDEBUGONLY(newPost)
    assert(newPostReposts.length === 1 && newPostReposts[0].googleid === kurantoNoMichiGoogleId, "New post repost not as expected")
    await Persistence.repostHook(kurantoNoMichi, newPost, true)
    let repostNotif = await Persistence.getNotificationDEBUGONLY(kurantoB, NotificationType.REPOST, newPost, kurantoNoMichi)
    assert(
        repostNotif
        && repostNotif.user && repostNotif.user.googleid === kurantoBGoogleId
        && repostNotif.type === NotificationType.REPOST
        && repostNotif.sourcePost && repostNotif.sourcePost.id === newPost.id
        && repostNotif.sourceUser && repostNotif.sourceUser.googleid === kurantoNoMichiGoogleId,
        "Repost notification does not match {user=post user, type=repost, sourcePost=new post, sourceUser=reposting user}"
    )
    let repostFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoNoMichi, newPost, FeedActivityType.REPOST)
    assert(
        repostFeedActivity
        && repostFeedActivity.sourceUser && repostFeedActivity.sourceUser.googleid === kurantoNoMichiGoogleId
        && repostFeedActivity.sourcePost && repostFeedActivity.sourcePost.id === newPost.id
        && repostFeedActivity.type === FeedActivityType.REPOST,
        "Repost feed activity does not match {sourceUser=reposting user, sourcePost=new post, type=repost}"
    )

    conditionalLog("  >> UNREPOST")

    await Persistence.unrepostPost(kurantoNoMichi.id, newPost.id)
    newPostReposts = await Persistence.getPostRepostsDEBUGONLY(newPost)
    assert(newPostReposts.length === 0, "New post reposts expected to be empty")
    await Persistence.repostHook(kurantoNoMichi, newPost, false)
    repostNotif = await Persistence.getNotificationDEBUGONLY(kurantoB, NotificationType.REPOST, newPost, kurantoNoMichi)
    assert(!repostNotif, "New post repost notification expected to be empty")
    repostFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoNoMichi, newPost, FeedActivityType.REPOST)
    assert(!repostFeedActivity, "New post repost feed activity expected to be empty")

    conditionalLog(">> REPLY")

    conditionalLog("  >> NEW REPLY")

    let newReply = await Persistence.postOrReply(
        kurantoNoMichiGoogleId,
        "This is a very long reply that should exceed the number of characters alloted to the preview. I think it's supposed to be 420, which is symbolic because Twitter started off with 140, then got extended to 280. It's only natural that we go to 420 from here. 420, you say. I know what you're thinking, but hold that thought. Wow, the 420 char limit is longer than I thought. How am I still not done? Well, in any case, I'm hopeful you peeps will make good use of all this space.",
        false,
        VisibilityType.EVERYONE,
        kurantoNoMichiGoogleId,
        [newPost.id],
        [])
    await Persistence.postOrReplyHook(newReply, [newPost.id])
    let newReplyNotif = await Persistence.getNotificationDEBUGONLY(kurantoB, NotificationType.REPLY, newReply, kurantoNoMichi)
    assert(
        newReplyNotif
        && newReplyNotif.user && newReplyNotif.user.googleid === kurantoBGoogleId
        && newReplyNotif.type === NotificationType.REPLY
        && newReplyNotif.sourcePost && newReplyNotif.sourcePost.id === newReply.id
        && newReplyNotif.sourceUser && newReplyNotif.sourceUser.googleid === kurantoNoMichiGoogleId,
        "Reply notification does not match {user=post user, type=reply, sourcePost=reply, sourceUser=replying user}"
    )
    let newReplyFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoNoMichi, newReply, FeedActivityType.POST)
    assert(
        newReplyFeedActivity
        && newReplyFeedActivity.sourceUser && newReplyFeedActivity.sourceUser.googleid === kurantoNoMichiGoogleId
        && newReplyFeedActivity.sourcePost && newReplyFeedActivity.sourcePost.id === newReply.id
        && newReplyFeedActivity.type === FeedActivityType.POST,
        "Reply feed activity does not match {sourceUser=replying user, sourcePost=reply, type=post}"
    )
    newReply = await Persistence.getPostByID(newReply.id)
    parentPostPromises = await Persistence.getParentPostPromisesByMappingIds(newReply.parentMappings.map((mapping) => mapping.id))
    assert(
        parentPostPromises.length === 1
        && (await parentPostPromises[0]).id === newPost.id,
        "Parent posts do not match [{new post}]"
    )

    conditionalLog("  >> DELETE PARENT POST")

    await Persistence.deletePost(newPost)
    const currentReply = await Persistence.getPostByID(newReply.id)
    assert(currentReply, "Failed to retrieve reply")
    newPostFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoB, newPost, FeedActivityType.POST)
    assert(!newPostFeedActivity, "Parent post feed activity expected to be empty")
    likeNotif = await Persistence.getNotificationDEBUGONLY(kurantoB, NotificationType.LIKE, newPost, kurantoNoMichi)
    assert(!likeNotif, "Parent post like notification expected to be empty")
    likeFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoNoMichi, newPost, FeedActivityType.LIKE)
    assert(!likeFeedActivity, "Parent post like feed activity expected to be empty")
    newReplyNotif = await Persistence.getNotificationDEBUGONLY(kurantoB, NotificationType.REPLY, newReply, kurantoNoMichi)
    assert(
        newReplyNotif
        && newReplyNotif.user && newReplyNotif.user.googleid === kurantoBGoogleId
        && newReplyNotif.type === NotificationType.REPLY
        && newReplyNotif.sourcePost && newReplyNotif.sourcePost.id === newReply.id
        && newReplyNotif.sourceUser && newReplyNotif.sourceUser.googleid === kurantoNoMichiGoogleId,
        "Reply notification does not match {user=post user, type=reply, sourcePost=reply, sourceUser=replying user}"
    )
    newReplyFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoNoMichi, newReply, FeedActivityType.POST)
    assert(
        newReplyFeedActivity
        && newReplyFeedActivity.sourceUser && newReplyFeedActivity.sourceUser.googleid === kurantoNoMichiGoogleId
        && newReplyFeedActivity.sourcePost && newReplyFeedActivity.sourcePost.id === newReply.id
        && newReplyFeedActivity.type === FeedActivityType.POST,
        "Reply feed activity does not match {sourceUser=replying user, sourcePost=reply, type=post}"
    )
    newReply = await Persistence.getPostByID(newReply.id)
    parentPostPromises = await Persistence.getParentPostPromisesByMappingIds(newReply.parentMappings.map((mapping) => mapping.id))
    assert(
        parentPostPromises.length === 1
        && (await parentPostPromises[0]) === null,
        "Parent posts expected to be empty"
    )

    conditionalLog(">> DM STORAGE")

    const formatDMs = (dms: DM[]) => dms.map((dm) => {
        return {
            sender: dm.sender ? toPrintableUser(dm.sender) : dm.sender,
            message: dm.message
        }
    })

    await clearDB()
    assert(await Persistence.checkDBEmptyDEBUGONLY(), "DB not cleared")

    const saved_number_of_retrievable_dm_s = consts.NUMBER_OF_RETRIEVABLE_DM_S
    consts.NUMBER_OF_RETRIEVABLE_DM_S = 2
    conditionalLog("Number of retrievable DMs: " + consts.NUMBER_OF_RETRIEVABLE_DM_S)

    await Persistence.createOrUpdateAccountHelper(null, kurantoBGoogleId, "kurantoB", "", "", false)
    kurantoB = await Persistence.getUserByGoogleID(kurantoBGoogleId)

    await Persistence.createOrUpdateAccountHelper(null, kurantoNoMichiGoogleId, "kurantonomichi", "", "", false)
    kurantoNoMichi = await Persistence.getUserByGoogleID(kurantoNoMichiGoogleId)

    await Persistence.createOrUpdateAccountHelper(null, "dummygoogleid", "dummy", "", "", false)
    dummyUser = await Persistence.getUserByGoogleID("dummygoogleid")

    const DMTimeline = [
        {
            user: kurantoB,
            recipient: kurantoNoMichi,
            message: "Zero",
            numInBank: 1
        },
        {
            user: kurantoB,
            recipient: kurantoNoMichi,
            message: "One",
            numInBank: 2
        },
        {
            user: kurantoNoMichi,
            recipient: kurantoB,
            message: "Ok two",
            numInBank: 2
        },
        {
            user: kurantoNoMichi,
            recipient: dummyUser,
            message: "Ok two too",
            numInBank: 1
        },
        {
            user: kurantoB,
            recipient: kurantoNoMichi,
            message: "Three",
            numInBank: 2
        },
        {
            user: dummyUser,
            recipient: kurantoNoMichi,
            message: "Two too?",
            numInBank: 2
        },
        {
            user: kurantoNoMichi,
            recipient: dummyUser,
            message: "Ok four too",
            numInBank: 2
        }
    ]

    let dmBank

    const funcBank: ((arg: any) => void)[] = []
    const executeAsync = async (functions: ((arg: any) => void)[], args: any[]) => {
        for (let i = 0; i < functions.length; i++) {
            await functions[i](args[i])
        }
    }

    DMTimeline.forEach((_) => {
        funcBank.push(async (dmUnit) => {
            const dmSession = await Persistence.sendDMAndReturnSession(dmUnit.user, dmUnit.recipient, dmUnit.message)
            await Persistence.processSessionPostDM(dmSession)
            const dm = await Persistence.getLatestDMFromSessionDEBUGONLY(dmSession)
            assert(dm.message === dmUnit.message, "Latest DM's message is unexpected")
            dmBank = await Persistence.getOneOnOneDMs(dmSession)
            assert(dmBank.length === dmUnit.numInBank, "Number in DM session bank does not match")
        })
    })

    await executeAsync(funcBank, DMTimeline)

    conditionalLog(">> DELETE DM, DELETE DM USER")

    await clearDB()
    assert(await Persistence.checkDBEmptyDEBUGONLY(), "DB not cleared")

    await Persistence.createOrUpdateAccountHelper(null, kurantoBGoogleId, "kurantoB", "", "", false)
    kurantoB = await Persistence.getUserByGoogleID(kurantoBGoogleId)

    await Persistence.createOrUpdateAccountHelper(null, kurantoNoMichiGoogleId, "kurantonomichi", "", "", false)
    kurantoNoMichi = await Persistence.getUserByGoogleID(kurantoNoMichiGoogleId)

    await Persistence.createOrUpdateAccountHelper(null, "dummygoogleid", "dummy", "", "", false)
    dummyUser = await Persistence.getUserByGoogleID("dummygoogleid")

    conditionalLog("  >> DELETE DM")

    const dmSession = await Persistence.sendDMAndReturnSession(kurantoB, kurantoNoMichi, "I'm deleting this")
    await Persistence.processSessionPostDM(dmSession)
    const dm0 = await Persistence.getLatestDMFromSessionDEBUGONLY(dmSession)

    await Persistence.sendDMAndReturnSession(kurantoNoMichi, kurantoB, "Ok")
    await Persistence.processSessionPostDM(dmSession)
    const dm1 = await Persistence.getLatestDMFromSessionDEBUGONLY(dmSession)

    await Persistence.deleteDM(dm0)
    dmBank = await Persistence.getOneOnOneDMs(dmSession)
    assert(dmBank[1].message === "[Deleted message]", "Deleted DM expected to be [Deleted message]")
    assert(dmBank[0].message === "Ok", "Not-deleted DM expected to be a different value")

    conditionalLog("  >> DELETE DM USER")

    const dmSession1 = await Persistence.sendDMAndReturnSession(kurantoB, dummyUser, "Remember me")
    await Persistence.processSessionPostDM(dmSession1)
    dmBank = await Persistence.getOneOnOneDMs(dmSession1)
    let allDmSessions = await Persistence.getAllDMSessionsDEBUGONLY()
    assert(
        allDmSessions.length === 2
        && allDmSessions[0].participant1 && allDmSessions[0].participant1.googleid === kurantoBGoogleId
        && allDmSessions[0].participant2 && allDmSessions[0].participant2.googleid === dummyUserID
        && allDmSessions[1].participant1 && allDmSessions[1].participant1.googleid === kurantoBGoogleId
        && allDmSessions[1].participant2 && allDmSessions[1].participant2.googleid === kurantoNoMichiGoogleId,
        "DM sessions do not match [{sender, receiver}, {sender, dummy}]"
    )

    const savedDmSenderGoogleID = kurantoBGoogleId
    await Persistence.cleanupDeletedUserDMs(savedDmSenderGoogleID)
    let delResult = await Persistence.deleteUser(kurantoBGoogleId)
    await cleanupDeletedUser(delResult)
    dmBank = await Persistence.getOneOnOneDMs(dmSession)
    assert(
        dmBank.length === 2
        && dmBank[0].sender && dmBank[0].sender.googleid === kurantoNoMichiGoogleId
        && !dmBank[1].sender,
        "Expected deleted user to be empty and not-deleted user to be non-empty in DM bank"
    )
    allDmSessions = await Persistence.getAllDMSessionsDEBUGONLY()
    assert(
        allDmSessions.length === 2
        && !allDmSessions[0].participant1
        && allDmSessions[0].participant2 && allDmSessions[0].participant2.googleid === dummyUserID
        && !allDmSessions[1].participant1
        && allDmSessions[1].participant2 && allDmSessions[1].participant2.googleid === kurantoNoMichiGoogleId,
        "DM sessions do not match [{null, receiver}, {null, dummy}]"
    )

    const savedDmRecipientGoogleID = kurantoNoMichiGoogleId
    await Persistence.cleanupDeletedUserDMs(savedDmRecipientGoogleID)
    delResult = await Persistence.deleteUser(kurantoNoMichiGoogleId)
    await cleanupDeletedUser(delResult)
    dmBank = await Persistence.getOneOnOneDMs(dmSession)
    assert(dmBank.length === 0, "Expected DM bank to be empty for DM session with both users deleted")
    dmBank = await Persistence.getOneOnOneDMs(dmSession1)
    assert(dmBank.length === 1, "Expected DM bank to be non-empty for DM session with one user deleted")
    allDmSessions = await Persistence.getAllDMSessionsDEBUGONLY()
    assert(
        allDmSessions.length === 1
        && !allDmSessions[0].participant1
        && allDmSessions[0].participant2 && allDmSessions[0].participant2.googleid === dummyUserID,
        "DM sessions do not match [{null, dummy}]"
    )

    await clearDB()
    assert(await Persistence.checkDBEmptyDEBUGONLY(), "DB not cleared")

    consts.NUMBER_OF_RETRIEVABLE_DM_S = saved_number_of_retrievable_dm_s
}