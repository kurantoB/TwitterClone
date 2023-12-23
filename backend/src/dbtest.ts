// "prebuild": "eslint .",

import * as Persistence from './persistence'
import { User } from "./entity/User"
import { Notification, NotificationType } from "./entity/Notification"
import { FeedActivity, FeedActivityType } from "./entity/FeedActivity"
import consts from "./consts"
import { Post, VisibilityType } from './entity/Post'
import { DM } from './entity/DM'
import { clearDB } from './index'
import { cleanupDeletedUser } from './utils/account'

export async function testDB2() {
}

const doLogging = true
function conditionalLog(msg: string) {
    if (doLogging) {
        console.log(`\n${msg}`)
    }
}

export default async function testDB() {
    const kurantoBID = "113542394053227098585"
    const kurantoNoMichiID = "113011160176295257673";
    conditionalLog("kurantoB googleid: " + kurantoBID)
    conditionalLog("kurantoNoMichi googleid: " + kurantoNoMichiID)

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

    let me: User
    let kurantoNoMichi: User

    // conditionalLog("\n\n===USER===")

    // await clearDB()
    // conditionalLog("DB cleared")

    // await Persistence.createOrUpdateAccountHelper(null, kurantoBID, "kurantoB", "", "", false)
    // me = await Persistence.getUserByGoogleID(kurantoBID)
    // conditionalLog("Inserted new user: " + JSON.stringify(toPrintableUser(me)))

    // // getUser
    // const loadedMe = await Persistence.getUserByGoogleID(kurantoBID)
    // conditionalLog("Loaded user: " + JSON.stringify(toPrintableUser(loadedMe)))

    // try {
    //     await Persistence.createOrUpdateAccountHelper(null, kurantoBID, "kurantoB", "", "", false)
    // } catch (error) {
    //     conditionalLog("Trying to insert kurantoB resulted in: " + error)
    // }

    // // deleteUser
    // let delResult0 = await Persistence.deleteUser(me.googleid)
    // await cleanupDeletedUser(delResult0)
    // conditionalLog("Deleted user " + me.googleid)
    // const deleteUserGetResult = await Persistence.getUserByGoogleID(me.googleid)
    // conditionalLog("Try get kurantoB: " + JSON.stringify(deleteUserGetResult))

    // conditionalLog("\n\n===FOLLOW, POST, LIKE, REPOST===")

    // await clearDB()
    // conditionalLog("DB cleared")

    // await Persistence.createOrUpdateAccountHelper(null, kurantoBID, "kurantoB", "", "", false)
    // me = await Persistence.getUserByGoogleID(kurantoBID)
    // conditionalLog("Inserted post user: " + JSON.stringify(toPrintableUser(me)))

    // await Persistence.createOrUpdateAccountHelper(null, kurantoNoMichiID, "kurantonomichi", "", "", false)
    // kurantoNoMichi = await Persistence.getUserByGoogleID(kurantoNoMichiID)
    // conditionalLog("Inserted follower user: " + JSON.stringify(toPrintableUser(kurantoNoMichi)))

    // conditionalLog("\n==FOLLOW")

    // await Persistence.follow(kurantoNoMichi.googleid, me.id)
    // conditionalLog("Follow done")
    // const postUserFollowers = await Persistence.getFollowersDEBUGONLY(me)
    // conditionalLog("Post user followers: " + JSON.stringify(toPrintableUsers(postUserFollowers)))
    // me = await Persistence.getUserByGoogleID(kurantoBID)
    // conditionalLog(`Post user follower/following/mutual counts: ${me.followerCount}, ${me.followingCount}, ${me.mutualCount}`)
    // const followerUserFollowing = await Persistence.getFollowingDEBUGONLY(kurantoNoMichi)
    // conditionalLog("Follower user following: " + JSON.stringify(toPrintableUsers(followerUserFollowing)))
    // kurantoNoMichi = await Persistence.getUserByGoogleID(kurantoNoMichiID)
    // conditionalLog(`Follower user follower/following/mutual counts: ${kurantoNoMichi.followerCount}, ${kurantoNoMichi.followingCount}, ${kurantoNoMichi.mutualCount}`)
    // await Persistence.followHook(kurantoNoMichi.googleid, me.id, true)
    // conditionalLog("Inserted new follow notification.")
    // let followNotif = await Persistence.getNotificationDEBUGONLY(me, NotificationType.FOLLOW, null, kurantoNoMichi)
    // conditionalLog("Try get new follow notification: " + JSON.stringify(toPrintableNotif(followNotif)))


    // conditionalLog("\n==FOLLOW BACK")

    // await Persistence.follow(me.googleid, kurantoNoMichi.id)
    // conditionalLog("Follow-back done")
    // me = await Persistence.getUserByGoogleID(kurantoBID)
    // conditionalLog(`Post user follower/following/mutual counts: ${me.followerCount}, ${me.followingCount}, ${me.mutualCount}`)
    // kurantoNoMichi = await Persistence.getUserByGoogleID(kurantoNoMichiID)
    // conditionalLog(`Follower user follower/following/mutual counts: ${kurantoNoMichi.followerCount}, ${kurantoNoMichi.followingCount}, ${kurantoNoMichi.mutualCount}`)
    // await Persistence.followHook(me.googleid, kurantoNoMichi.id, true)
    // conditionalLog("Inserted new follow notification")
    // followNotif = await Persistence.getNotificationDEBUGONLY(kurantoNoMichi, NotificationType.FOLLOW, null, me)
    // conditionalLog("Try get new follow notification: " + JSON.stringify(toPrintableNotif(followNotif)))


    // conditionalLog("\n==UNFOLLOW BACK")

    // await Persistence.unfollow(me.googleid, kurantoNoMichi.id)
    // conditionalLog("Undo follow-back done")
    // me = await Persistence.getUserByGoogleID(kurantoBID)
    // conditionalLog(`Post user follower/following/mutual counts: ${me.followerCount}, ${me.followingCount}, ${me.mutualCount}`)
    // kurantoNoMichi = await Persistence.getUserByGoogleID(kurantoNoMichiID)
    // conditionalLog(`Follower user follower/following/mutual counts: ${kurantoNoMichi.followerCount}, ${kurantoNoMichi.followingCount}, ${kurantoNoMichi.mutualCount}`)
    // await Persistence.followHook(me.googleid, kurantoNoMichi.id, false)
    // conditionalLog("Deleted new Follow notification")
    // followNotif = await Persistence.getNotificationDEBUGONLY(kurantoNoMichi, NotificationType.FOLLOW, null, me)
    // conditionalLog("Try get new follow notification: " + JSON.stringify(toPrintableNotif(followNotif)))

    // conditionalLog("\n==POST")

    // const newPost = await Persistence.postOrReply(me.googleid, "Hello, this is a short post.", false, VisibilityType.EVERYONE, me.googleid, null, [])
    // conditionalLog("Inserted new post: " + JSON.stringify(toPrintablePost(newPost)))
    // await Persistence.postOrReplyHook(newPost, null)
    // conditionalLog("Inserted new post feed activity")
    // let newPostFeedActivity = await Persistence.getFeedActivityDEBUGONLY(me, newPost, FeedActivityType.POST)
    // conditionalLog("Try get new post feed activity: " + JSON.stringify(toPrintableFeedActivity(newPostFeedActivity)))

    // conditionalLog("\n==LIKE")

    // await Persistence.likePost(kurantoNoMichi.id, newPost.id)
    // conditionalLog("Like done")
    // let newPostLikes = await Persistence.getPostLikesDEBUGONLY(newPost)
    // conditionalLog("New post likes: " + JSON.stringify(toPrintableUsers(newPostLikes)))
    // await Persistence.likePostHook(kurantoNoMichi, newPost, true)
    // conditionalLog("Inserted new like notification and feed activity")
    // let likeNotif = await Persistence.getNotificationDEBUGONLY(me, NotificationType.LIKE, newPost, kurantoNoMichi)
    // conditionalLog("Try get new like notification: " + JSON.stringify(toPrintableNotif(likeNotif)))
    // let likeFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoNoMichi, newPost, FeedActivityType.LIKE)
    // conditionalLog("Try get new like feed activity: " + JSON.stringify(toPrintableFeedActivity(likeFeedActivity)))

    // conditionalLog("\n==UNLIKE")

    // await Persistence.unlikePost(kurantoNoMichi.id, newPost.id)
    // conditionalLog("Unlike done")
    // newPostLikes = await Persistence.getPostLikesDEBUGONLY(newPost)
    // conditionalLog("New post likes: " + JSON.stringify(toPrintableUsers(newPostLikes)))
    // await Persistence.likePostHook(kurantoNoMichi, newPost, false)
    // conditionalLog("Unlike hook done")
    // likeNotif = await Persistence.getNotificationDEBUGONLY(me, NotificationType.LIKE, newPost, kurantoNoMichi)
    // conditionalLog("Try get new like notification: " + JSON.stringify(toPrintableNotif(likeNotif)))
    // likeFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoNoMichi, newPost, FeedActivityType.LIKE)
    // conditionalLog("Try get new like feed activity: " + JSON.stringify(toPrintableFeedActivity(likeFeedActivity)))

    // conditionalLog("\n==RE-LIKE")
    // await Persistence.likePost(kurantoNoMichi.id, newPost.id)
    // conditionalLog("Re-like done")
    // await Persistence.likePostHook(kurantoNoMichi, newPost, true)
    // likeNotif = await Persistence.getNotificationDEBUGONLY(me, NotificationType.LIKE, newPost, kurantoNoMichi)
    // conditionalLog("Try get re-like notification: " + JSON.stringify(toPrintableNotif(likeNotif)))
    // likeFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoNoMichi, newPost, FeedActivityType.LIKE)
    // conditionalLog("Try get re-like feed activity: " + JSON.stringify(toPrintableFeedActivity(likeFeedActivity)))

    // conditionalLog("\n==REPOST")

    // await Persistence.repostPost(kurantoNoMichi.id, newPost.id)
    // conditionalLog("Repost done")
    // let newPostReposts = await Persistence.getPostRepostsDEBUGONLY(newPost)
    // conditionalLog("New post reposts: " + JSON.stringify(toPrintableUsers(newPostReposts)))
    // await Persistence.repostHook(kurantoNoMichi, newPost, true)
    // conditionalLog("Inserted new repost notification and feed activity")
    // let repostNotif = await Persistence.getNotificationDEBUGONLY(me, NotificationType.REPOST, newPost, kurantoNoMichi)
    // conditionalLog("Try get new repost notification: " + JSON.stringify(toPrintableNotif(repostNotif)))
    // let repostFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoNoMichi, newPost, FeedActivityType.REPOST)
    // conditionalLog("Try get new repost feed activity: " + JSON.stringify(toPrintableFeedActivity(repostFeedActivity)))

    // conditionalLog("\n==UNREPOST")

    // await Persistence.unrepostPost(kurantoNoMichi.id, newPost.id)
    // conditionalLog("Unrepost done")
    // newPostReposts = await Persistence.getPostRepostsDEBUGONLY(newPost)
    // conditionalLog("New post reposts: " + JSON.stringify(toPrintableUsers(newPostReposts)))
    // await Persistence.repostHook(kurantoNoMichi, newPost, false)
    // conditionalLog("Unrepost hook done")
    // repostNotif = await Persistence.getNotificationDEBUGONLY(me, NotificationType.REPOST, newPost, kurantoNoMichi)
    // conditionalLog("Try get new repost notification: " + JSON.stringify(toPrintableNotif(repostNotif)))
    // repostFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoNoMichi, newPost, FeedActivityType.REPOST)
    // conditionalLog("Try get new repost feed activity: " + JSON.stringify(toPrintableFeedActivity(repostFeedActivity)))

    // conditionalLog("\n==REPLY")

    // let newReply = await Persistence.postOrReply(
    //     kurantoNoMichi.googleid,
    //     "This is a very long reply that should exceed the number of characters alloted to the preview. I think it's supposed to be 420, which is symbolic because Twitter started off with 140, then got extended to 280. It's only natural that we go to 420 from here. 420, you say. I know what you're thinking, but hold that thought. Wow, the 420 char limit is longer than I thought. How am I still not done? Well, in any case, I'm hopeful you peeps will make good use of all this space.",
    //     false,
    //     VisibilityType.EVERYONE,
    //     kurantoNoMichi.googleid,
    //     [newPost.id],
    //     [])
    // conditionalLog("Inserted new reply: " + JSON.stringify(toPrintablePost(newReply)))
    // await Persistence.postOrReplyHook(newReply, [newPost.id])
    // conditionalLog("Inserted new reply notification and feed activity")
    // let newReplyNotif = await Persistence.getNotificationDEBUGONLY(me, NotificationType.REPLY, newReply, kurantoNoMichi)
    // conditionalLog("Try get new reply notification: " + JSON.stringify(toPrintableNotif(newReplyNotif)))
    // let newReplyFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoNoMichi, newReply, FeedActivityType.POST)
    // conditionalLog("Try get new reply feed activity: " + JSON.stringify(toPrintableFeedActivity(newReplyFeedActivity)))
    // conditionalLog("Try get new reply parent posts")
    // newReply = await Persistence.getPostByID(newReply.id)
    // if (newReply.parentMappings) {
    //     const parentPostPromises = await Persistence.getParentPostPromisesByMappingIds(newReply.parentMappings.map((mapping) => mapping.id))
    //     for (const parentPostPromise of parentPostPromises) {
    //         conditionalLog("New reply parent post: " + JSON.stringify(toPrintablePost(await parentPostPromise)))
    //     }
    // }

    // conditionalLog("\n==DELETE PARENT POST")

    // await Persistence.deletePost(newPost)
    // conditionalLog("Deleted parent post: " + JSON.stringify(toPrintablePost(newPost)))
    // const currentReply = await Persistence.getPostByID(newReply.id)
    // conditionalLog("Try get reply: " + JSON.stringify(toPrintablePost(currentReply)))
    // newPostFeedActivity = await Persistence.getFeedActivityDEBUGONLY(me, newPost, FeedActivityType.POST)
    // conditionalLog("Try get parent post feed activity: " + JSON.stringify(newPostFeedActivity))
    // likeNotif = await Persistence.getNotificationDEBUGONLY(me, NotificationType.LIKE, newPost, kurantoNoMichi)
    // conditionalLog("Try get parent post like notification: " + JSON.stringify(toPrintableNotif(likeNotif)))
    // likeFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoNoMichi, newPost, FeedActivityType.LIKE)
    // conditionalLog("Try get parent post like feed activity: " + JSON.stringify(toPrintableFeedActivity(likeFeedActivity)))
    // newReplyNotif = await Persistence.getNotificationDEBUGONLY(me, NotificationType.REPLY, newReply, kurantoNoMichi)
    // conditionalLog("Try get reply notification: " + JSON.stringify(toPrintableNotif(newReplyNotif)))
    // newReplyFeedActivity = await Persistence.getFeedActivityDEBUGONLY(kurantoNoMichi, newReply, FeedActivityType.POST)
    // conditionalLog("Try get reply feed activity: " + JSON.stringify(toPrintableFeedActivity(newReplyFeedActivity)))
    // conditionalLog("Try get reply parent posts")
    // newReply = await Persistence.getPostByID(newReply.id)
    // if (newReply.parentMappings) {
    //     const parentPostPromises = await Persistence.getParentPostPromisesByMappingIds(newReply.parentMappings.map((mapping) => mapping.id))
    //     for (const parentPostPromise of parentPostPromises) {
    //         conditionalLog("Reply parent post: " + JSON.stringify(toPrintablePost(await parentPostPromise)))
    //     }
    // }

    conditionalLog("\n\n===DM===")

    const formatDMs = (dms: DM[]) => dms.map((dm) => {
        return {
            id: dm.id,
            sender: dm.sender ? toPrintableUser(dm.sender) : dm.sender,
            recipient: dm.recipient ? toPrintableUser(dm.recipient) : dm.recipient,
            message: dm.message,
            ordering: dm.ordering
        }
    })

    await clearDB()
    conditionalLog("DB cleared")

    const saved_number_of_retrievable_dm_s = consts.NUMBER_OF_RETRIEVABLE_DM_S
    consts.NUMBER_OF_RETRIEVABLE_DM_S = 2
    conditionalLog("Number of retrievable DMs: " + consts.NUMBER_OF_RETRIEVABLE_DM_S)

    await Persistence.createOrUpdateAccountHelper(null, kurantoBID, "kurantoB", "", "", false)
    me = await Persistence.getUserByGoogleID(kurantoBID)
    conditionalLog("Inserted sender user: " + JSON.stringify({ ...toPrintableUser(me), id: me.id }))

    await Persistence.createOrUpdateAccountHelper(null, kurantoNoMichiID, "kurantonomichi", "", "", false)
    kurantoNoMichi = await Persistence.getUserByGoogleID(kurantoNoMichiID)
    conditionalLog("Inserted receiver user: " + JSON.stringify({ ...toPrintableUser(kurantoNoMichi), id: kurantoNoMichi.id }))

    const DMTimeline = [
        {
            user: me,
            message: "Zero"
        },
        {
            user: me,
            message: "One"
        },
        {
            user: kurantoNoMichi,
            message: "Ok two"
        },
        {
            user: me,
            message: "Three"
        },
        {
            user: kurantoNoMichi,
            message: "Ok four"
        },
        {
            user: kurantoNoMichi,
            message: "Ok five"
        },
        {
            user: me,
            message: "Six"
        },
        {
            user: me,
            message: "Seven"
        }
    ]

    let dmBank

    let funcBank: ((arg: any) => void)[] = []
    const executeAsync = async (functions: ((arg: any) => void)[], args: any[]) => {
        for (let i = 0; i < functions.length; i++) {
            await functions[i](args[i])
        }
    }

    DMTimeline.forEach((_) => {
        funcBank.push(async (dmUnit) => {
            conditionalLog("\n==NEW DM")
            await Persistence.sendDM(dmUnit.user, dmUnit.user === me ? kurantoNoMichi : me, dmUnit.message)
            conditionalLog(dmUnit.user.username + " says '" + dmUnit.message + "'")
            dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
            conditionalLog("DM bank: " + JSON.stringify(formatDMs(dmBank)))
        })
    })

    await executeAsync(funcBank, DMTimeline)

    await clearDB()
    conditionalLog("\nDB cleared")

    await Persistence.createOrUpdateAccountHelper(null, kurantoBID, "kurantoB", "", "", false)
    me = await Persistence.getUserByGoogleID(kurantoBID)
    conditionalLog("Inserted sender user: " + JSON.stringify(toPrintableUser(me)))

    await Persistence.createOrUpdateAccountHelper(null, kurantoNoMichiID, "kurantonomichi", "", "", false)
    kurantoNoMichi = await Persistence.getUserByGoogleID(kurantoNoMichiID)
    conditionalLog("Inserted receiver user: " + JSON.stringify(toPrintableUser(kurantoNoMichi)))

    await Persistence.createOrUpdateAccountHelper(null, "dummygoogleid", "dummy", "", "", false)
    const dummyUser = await Persistence.getUserByGoogleID("dummygoogleid")
    conditionalLog("Inserted dummy user: " + JSON.stringify({ ...toPrintableUser(dummyUser), id: dummyUser.id }))

    conditionalLog("\n==NEW DM")
    const dm0 = await Persistence.sendDM(me, kurantoNoMichi, "I'm deleting this")
    conditionalLog(me.username + " says 'I'm deleting this'")
    dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
    conditionalLog("DM bank: " + JSON.stringify(formatDMs(dmBank)))

    conditionalLog("\n==NEW DM")
    const dm1 = await Persistence.sendDM(kurantoNoMichi, me, "Ok")
    conditionalLog(kurantoNoMichi.username + " says 'Ok'")
    dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
    conditionalLog("DM bank: " + JSON.stringify(formatDMs(dmBank)))

    conditionalLog("\n==DELETE DM")

    await Persistence.deleteDM(dm0)
    conditionalLog(me.username + " deleted a DM")
    dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
    conditionalLog("DM bank: " + JSON.stringify(formatDMs(dmBank)))

    conditionalLog("\n==DELETE SECOND DM")

    await Persistence.deleteDM(dm1)
    conditionalLog(kurantoNoMichi.username + " deleted a DM")
    dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
    conditionalLog("DM bank: " + JSON.stringify(formatDMs(dmBank)))

    conditionalLog("\n==DM TO DUMMY")

    await Persistence.sendDM(me, dummyUser, "Remember me")
    conditionalLog(me.username + " says 'Remember me'")
    dmBank = await Persistence.getOneOnOneDMs(me.id, dummyUser.id)
    conditionalLog("DM bank: " + JSON.stringify(formatDMs(dmBank)))

    conditionalLog("\n==DELETE DM-ER")

    const savedDmSenderGoogleID = me.googleid
    await Persistence.cleanupDeletedUserDMs(savedDmSenderGoogleID)
    let delResult = await Persistence.deleteUser(me.googleid)
    await cleanupDeletedUser(delResult)
    conditionalLog("Deleted " + savedDmSenderGoogleID)
    dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
    conditionalLog("DM bank: " + JSON.stringify(formatDMs(dmBank)))

    conditionalLog("\n==DELETE SECOND DM-ER")

    const savedDmRecipientGoogleID = kurantoNoMichi.googleid
    await Persistence.cleanupDeletedUserDMs(savedDmRecipientGoogleID)
    delResult = await Persistence.deleteUser(kurantoNoMichi.googleid)
    await cleanupDeletedUser(delResult)
    conditionalLog("Deleted " + savedDmRecipientGoogleID)
    dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
    conditionalLog("DM bank: " + JSON.stringify(formatDMs(dmBank)))

    dmBank = await Persistence.getOneOnOneDMs(me.id, dummyUser.id)
    conditionalLog("DM bank (dummy user): " + JSON.stringify(formatDMs(dmBank)))

    consts.NUMBER_OF_RETRIEVABLE_DM_S = saved_number_of_retrievable_dm_s

    conditionalLog("\n\n===Clear DB===")

    await clearDB()
    conditionalLog("DB cleared")
}