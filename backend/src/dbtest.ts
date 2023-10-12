import * as Persistence from './persistence'
import { User } from "./entity/User"
import { NotificationType } from "./entity/Notification"
import { FeedActivityType } from "./entity/FeedActivity"
import consts from "./consts"

export async function clearDB() {
    await Persistence.clearDB()
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
    let me: User
    let kurantoNoMichi: User

    conditionalLog("\n\n===USER===")

    await Persistence.clearDB()
    conditionalLog("DB cleared")

    await Persistence.createOrUpdateAccountHelper(null, kurantoBID, "kurantoB", "", "")
    me = await Persistence.getUser(kurantoBID)
    conditionalLog("inserted new user: " + JSON.stringify(me))

    // getUser
    const loadedMe = await Persistence.getUser(kurantoBID)
    conditionalLog("loaded user: " + JSON.stringify(loadedMe))

    // deleteUser
    await Persistence.deleteUser(me.id)
    conditionalLog("deleted user " + kurantoBID)
    const deleteUserGetResult = await Persistence.getUser(kurantoBID)
    conditionalLog("try get kurantoB: " + JSON.stringify(deleteUserGetResult))

    conditionalLog("\n\n===FOLLOW, POST, LIKE, REPOST===")

    await Persistence.clearDB()
    conditionalLog("DB cleared")

    await Persistence.createOrUpdateAccountHelper(null, kurantoBID, "kurantoB", "", "")
    me = await Persistence.getUser(kurantoBID)
    conditionalLog("inserted post user: " + JSON.stringify(me))

    await Persistence.createOrUpdateAccountHelper(null, kurantoNoMichiID, "kurantonomichi", "", "")
    kurantoNoMichi = await Persistence.getUser(kurantoNoMichiID)
    conditionalLog("inserted follower user: " + JSON.stringify(kurantoNoMichi))

    await Persistence.follow(kurantoNoMichi, me)
    conditionalLog("Follow done")
    const postUserFollowers = await Persistence.getFollowers(me)
    conditionalLog("Post user followers: " + JSON.stringify(postUserFollowers))
    me = await Persistence.getUser(kurantoBID)
    conditionalLog(`Post user follower/following/mutual counts: ${me.followerCount}, ${me.followingCount}, ${me.mutualCount}`)
    const followerUserFollowing = await Persistence.getFollowing(kurantoNoMichi)
    conditionalLog("Follower user following: " + JSON.stringify(followerUserFollowing))
    kurantoNoMichi = await Persistence.getUser(kurantoNoMichiID)
    conditionalLog(`Follower user follower/following/mutual counts: ${kurantoNoMichi.followerCount}, ${kurantoNoMichi.followingCount}, ${kurantoNoMichi.mutualCount}`)
    const followNotif = await Persistence.followHook(kurantoNoMichi, me, true)
    conditionalLog("inserted new follow notification: " + JSON.stringify(followNotif))

    await Persistence.follow(me, kurantoNoMichi)
    conditionalLog("Follow-back done")
    me = await Persistence.getUser(kurantoBID)
    conditionalLog(`Post user follower/following/mutual counts: ${me.followerCount}, ${me.followingCount}, ${me.mutualCount}`)
    kurantoNoMichi = await Persistence.getUser(kurantoNoMichiID)
    conditionalLog(`Follower user follower/following/mutual counts: ${kurantoNoMichi.followerCount}, ${kurantoNoMichi.followingCount}, ${kurantoNoMichi.mutualCount}`)

    await Persistence.unfollow(me, kurantoNoMichi)
    conditionalLog("Undo follow-back done")
    me = await Persistence.getUser(kurantoBID)
    conditionalLog(`Post user follower/following/mutual counts: ${me.followerCount}, ${me.followingCount}, ${me.mutualCount}`)
    kurantoNoMichi = await Persistence.getUser(kurantoNoMichiID)
    conditionalLog(`Follower user follower/following/mutual counts: ${kurantoNoMichi.followerCount}, ${kurantoNoMichi.followingCount}, ${kurantoNoMichi.mutualCount}`)
    
    const newPost = await Persistence.postOrReply(me, "Hello, this is a short post.")
    conditionalLog("Inserted new post: " + JSON.stringify(newPost))
    const newPostFeedActivity = await Persistence.postOrReplyHook(newPost)
    conditionalLog("Inserted new post feed activity: " + JSON.stringify(newPostFeedActivity))

    await Persistence.likePost(kurantoNoMichi, newPost)
    conditionalLog("Like done")
    const newPostLikes = await Persistence.getPostLikes(newPost)
    conditionalLog("New post likes: " + JSON.stringify(newPostLikes.map((user) => user.id)))
    const newLikeFeedActivity = await Persistence.likePostHook(kurantoNoMichi, newPost, true)
    conditionalLog("Inserted new like feed activity: " + JSON.stringify(newLikeFeedActivity))
    const likeNotif = await Persistence.getNotification(me, NotificationType.LIKE, newPost, kurantoNoMichi)
    conditionalLog("Try get new like notification: " + JSON.stringify(likeNotif))

    await Persistence.unlikePost(kurantoNoMichi, newPost)
    conditionalLog("Unlike done")
    await Persistence.likePostHook(kurantoNoMichi, newPost, false)
    conditionalLog("Unlike hook done")
    const newNewPostLikes = await Persistence.getPostLikes(newPost)
    conditionalLog("New post likes: " + JSON.stringify(newNewPostLikes.map((user) => user.id)))
    const newNewLikeFeedActivity = await Persistence.getFeedActivity(kurantoNoMichi, newPost, FeedActivityType.LIKE)
    conditionalLog("Try get new like feed activity: " + JSON.stringify(newNewLikeFeedActivity))
    const newLikeNotif = await Persistence.getNotification(me, NotificationType.LIKE, newPost, kurantoNoMichi)
    conditionalLog("Try get new like notification: " + JSON.stringify(newLikeNotif))

    await Persistence.repostPost(kurantoNoMichi, newPost)
    conditionalLog("Repost done")
    const newPostReposts = await Persistence.getPostReposts(newPost)
    conditionalLog("New post reposts: " + JSON.stringify(newPostReposts.map((user) => user.id)))
    const newRepostFeedActivity = await Persistence.repostHook(kurantoNoMichi, newPost, true)
    conditionalLog("Inserted new repost feed activity: " + JSON.stringify(newRepostFeedActivity))
    const repostNotif = await Persistence.getNotification(me, NotificationType.REPOST, newPost, kurantoNoMichi)
    conditionalLog("Try get new repost notification: " + JSON.stringify(repostNotif))

    await Persistence.unrepostPost(kurantoNoMichi, newPost)
    conditionalLog("Unrepost done")
    await Persistence.repostHook(kurantoNoMichi, newPost, false)
    conditionalLog("Unrepost hook done")
    const newNewPostReposts = await Persistence.getPostReposts(newPost)
    conditionalLog("New post reposts: " + JSON.stringify(newNewPostReposts.map((user) => user.id)))
    const newNewRepostFeedActivity = await Persistence.getFeedActivity(kurantoNoMichi, newPost, FeedActivityType.REPOST)
    conditionalLog("Try get new repost feed activity: " + JSON.stringify(newNewRepostFeedActivity))
    const newRepostNotif = await Persistence.getNotification(me, NotificationType.REPOST, newPost, kurantoNoMichi)
    conditionalLog("Try get new repost notification: " + JSON.stringify(newRepostNotif))

    await Persistence.likePost(kurantoNoMichi, newPost)
    conditionalLog("Relike done")

    const newReply = await Persistence.postOrReply(
        kurantoNoMichi,
        "This is a very long reply that should exceed the number of characters alloted to the preview. I think it's supposed to be 420, which is symbolic because Twitter started off with 140, then got extended to 280. It's only natural that we go to 420 from here. 420, you say. I know what you're thinking, but hold that thought. Wow, the 420 char limit is longer than I thought. How am I still not done? Well, in any case, I'm hopeful you peeps will make good use of all this space.",
        newPost)
    conditionalLog("Inserted new reply: " + JSON.stringify(newReply))
    const newReplyFeedActivity = await Persistence.postOrReplyHook(newReply, newPost)
    conditionalLog("Inserted new reply feed activity: " + JSON.stringify(newReplyFeedActivity))
    const newReplyNotif = await Persistence.getNotification(me, NotificationType.REPLY, newReply, kurantoNoMichi)
    conditionalLog("Try get new reply notification: " + JSON.stringify(newReplyNotif))

    const deletedParentPost = await Persistence.deletePost(newPost)
    conditionalLog("Deleted parent post: " + JSON.stringify(deletedParentPost))
    const currentReply = await Persistence.getPostByID(newReply.id)
    conditionalLog("Try get reply: " + JSON.stringify(currentReply))
    const deletedParentPostFeedActivity = await Persistence.getFeedActivity(me, newPost, FeedActivityType.POST)
    conditionalLog("Try get parent post feed activity: " + JSON.stringify(deletedParentPostFeedActivity))
    const deletedParentPostLikeFeedActivity = await Persistence.getFeedActivity(kurantoNoMichi, newPost, FeedActivityType.LIKE)
    conditionalLog("Try get parent post like feed activity: " + JSON.stringify(deletedParentPostLikeFeedActivity))
    const deletedParentPostLikeNotification = await Persistence.getNotification(me, NotificationType.LIKE, newPost, kurantoNoMichi)
    conditionalLog("Try get parent post like notification: " + JSON.stringify(deletedParentPostLikeNotification))
    const deletedParentPostReplyNotification = await Persistence.getNotification(me, NotificationType.REPLY, newReply, kurantoNoMichi)
    conditionalLog("Try get parent post new reply notification: " + JSON.stringify(deletedParentPostReplyNotification))

    conditionalLog("\n\n===DM===")

    await Persistence.clearDB()
    conditionalLog("DB cleared")

    const saved_number_of_retrievable_dm_s = consts.NUMBER_OF_RETRIEVABLE_DM_S
    consts.NUMBER_OF_RETRIEVABLE_DM_S = 2

    await Persistence.createOrUpdateAccountHelper(null, kurantoBID, "kurantoB", "", "")
    me = await Persistence.getUser(kurantoBID)
    conditionalLog("inserted sender user: " + JSON.stringify(me))

    await Persistence.createOrUpdateAccountHelper(null, kurantoNoMichiID, "kurantonomichi", "", "")
    kurantoNoMichi = await Persistence.getUser(kurantoNoMichiID)
    conditionalLog("inserted receiver user: " + JSON.stringify(kurantoNoMichi))

    const dm = await Persistence.sendDM(me, kurantoNoMichi, "Howdy")
    conditionalLog("user1 sent DM: " + JSON.stringify(dm))
    let dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
    conditionalLog("DM bank: " + JSON.stringify(dmBank))

    const dm2 = await Persistence.sendDM(kurantoNoMichi, me, "Yo")
    conditionalLog("user2 sent DM: " + JSON.stringify(dm2))
    dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
    conditionalLog("DM bank: " + JSON.stringify(dmBank))

    const dm3 = await Persistence.sendDM(me, kurantoNoMichi, "Howdy howdy")
    conditionalLog("user1 sent DM: " + JSON.stringify(dm3))
    dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
    conditionalLog("DM bank: " + JSON.stringify(dmBank))

    const dm4 = await Persistence.sendDM(kurantoNoMichi, me, "What is it?")
    conditionalLog("user2 sent DM: " + JSON.stringify(dm4))
    dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
    conditionalLog("DM bank: " + JSON.stringify(dmBank))

    const dm5 = await Persistence.sendDM(kurantoNoMichi, me, "Speak up")
    conditionalLog("user2 sent DM: " + JSON.stringify(dm5))
    dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
    conditionalLog("DM bank: " + JSON.stringify(dmBank))

    const dm6 = await Persistence.sendDM(me, kurantoNoMichi, "Nothing")
    conditionalLog("user1 sent DM: " + JSON.stringify(dm6))
    dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
    conditionalLog("DM bank: " + JSON.stringify(dmBank))

    const dm7 = await Persistence.sendDM(me, kurantoNoMichi, "Bye")
    conditionalLog("user1 sent DM: " + JSON.stringify(dm7))
    dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
    conditionalLog("DM bank: " + JSON.stringify(dmBank))

    await Persistence.deleteDM(dm)
    await Persistence.deleteDM(dm3)
    await Persistence.deleteDM(dm6)
    await Persistence.deleteDM(dm7)
    conditionalLog("User 1 deleted all DMs.")
    dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
    conditionalLog("DM bank: " + JSON.stringify(dmBank))

    const savedDmSenderID = me.id
    await Persistence.deleteUser(me.id)
    conditionalLog("Deleted user1")
    dmBank = await Persistence.getOneOnOneDMs(savedDmSenderID, kurantoNoMichi.id)
    conditionalLog("DM bank: " + JSON.stringify(dmBank))

    const savedDmRecipientID = kurantoNoMichi.id
    await Persistence.deleteUser(kurantoNoMichi.id)
    conditionalLog("Deleted user2")
    dmBank = await Persistence.getOneOnOneDMs(savedDmSenderID, savedDmRecipientID)
    conditionalLog("DM bank: " + JSON.stringify(dmBank))

    consts.NUMBER_OF_RETRIEVABLE_DM_S = saved_number_of_retrievable_dm_s

    conditionalLog("\n\n===Clear DB===")

    await Persistence.clearDB()
    conditionalLog("DB cleared")
}