import * as Persistence from './persistence'
import { User } from "./entity/User"
import { NotificationType } from "./entity/Notification"
import { FeedActivityType } from "./entity/FeedActivity"
import consts from "./consts"

export default function testDB() {
    Persistence.initialize().then(async () => {
        const kurantoBID = "113542394053227098585"
        const kurantoNoMichiID = "113011160176295257673";

        console.log("\n\n\n===USER===")

        await Persistence.clearDB()
        console.log("\nDB cleared")

        const me: User = new User()
        me.googleid = kurantoBID
        me.username = "kurantoB"
        me.bio = ""
        await Persistence.insertUser(me)
        console.log("\ninserted new user: " + JSON.stringify(me))

        // getUser
        const loadedMe = await Persistence.getUser(kurantoBID)
        console.log("\nloaded user: " + JSON.stringify(loadedMe))

        // deleteUser
        await Persistence.deleteUser(loadedMe)
        console.log("\ndeleted user " + kurantoBID)
        const deleteUserGetResult = await Persistence.getUser(kurantoBID)
        console.log("\ntry get kurantoB: " + JSON.stringify(deleteUserGetResult))

        const saved_max_users = consts.MAX_USERS
        consts.MAX_USERS = 1

        // reinsert user
        await Persistence.insertUser(me)
        console.log("\ninserted new user: " + JSON.stringify(me))

        const kurantoNoMichi: User = new User()
        kurantoNoMichi.googleid = kurantoNoMichiID
        kurantoNoMichi.username = "kurantoNoMichi"
        kurantoNoMichi.bio = ""

        try {
            await Persistence.insertUser(kurantoNoMichi)
        } catch (error) {
            console.log(`\nCaught error: ${error}`)
        }

        consts.MAX_USERS = saved_max_users

        console.log("\n\n\n===FOLLOW, POST, LIKE, REPOST===")

        await Persistence.clearDB()
        console.log("\nDB cleared")

        await Persistence.insertUser(me)
        console.log("\ninserted post user: " + JSON.stringify(me))

        await Persistence.insertUser(kurantoNoMichi)
        console.log("\ninserted follower user: " + JSON.stringify(kurantoNoMichi))

        await Persistence.follow(kurantoNoMichi, me)
        console.log("\nFollow done")
        const postUserFollowers = await Persistence.getFollowers(me)
        console.log("\nPost user followers: " + JSON.stringify(postUserFollowers))
        const followerUserFollowing = await Persistence.getFollowing(kurantoNoMichi)
        console.log("\nFollower user following: " + JSON.stringify(followerUserFollowing))
        const followNotif = await Persistence.followHook(kurantoNoMichi, me, true)
        console.log("\ninserted new follow notification: " + JSON.stringify(followNotif))

        const newPost = await Persistence.postOrReply(me, "Hello, this is a short post.")
        console.log("\nInserted new post: " + JSON.stringify(newPost))
        const newPostFeedActivity = await Persistence.postOrReplyHook(newPost)
        console.log("\nInserted new post feed activity: " + JSON.stringify(newPostFeedActivity))

        await Persistence.likePost(kurantoNoMichi, newPost)
        console.log("\nLike done")
        const newPostLikes = await Persistence.getPostLikes(newPost)
        console.log("\nNew post likes: " + JSON.stringify(newPostLikes.map((user) => user.id)))
        const newLikeFeedActivity = await Persistence.likePostHook(kurantoNoMichi, newPost, true)
        console.log("\nInserted new like feed activity: " + JSON.stringify(newLikeFeedActivity))
        const likeNotif = await Persistence.getNotification(me, NotificationType.LIKE, newPost, kurantoNoMichi)
        console.log("\nTry get new like notification: " + JSON.stringify(likeNotif))

        await Persistence.unlikePost(kurantoNoMichi, newPost)
        console.log("\nUnlike done")
        await Persistence.likePostHook(kurantoNoMichi, newPost, false)
        console.log("\nUnlike hook done")
        const newNewPostLikes = await Persistence.getPostLikes(newPost)
        console.log("\nNew post likes: " + JSON.stringify(newNewPostLikes.map((user) => user.id)))
        const newNewLikeFeedActivity = await Persistence.getFeedActivity(kurantoNoMichi, newPost, FeedActivityType.LIKE)
        console.log("\nTry get new like feed activity: " + JSON.stringify(newNewLikeFeedActivity))
        const newLikeNotif = await Persistence.getNotification(me, NotificationType.LIKE, newPost, kurantoNoMichi)
        console.log("\nTry get new like notification: " + JSON.stringify(newLikeNotif))

        await Persistence.repostPost(kurantoNoMichi, newPost)
        console.log("\nRepost done")
        const newPostReposts = await Persistence.getPostReposts(newPost)
        console.log("\nNew post reposts: " + JSON.stringify(newPostReposts.map((user) => user.id)))
        const newRepostFeedActivity = await Persistence.repostHook(kurantoNoMichi, newPost, true)
        console.log("\nInserted new repost feed activity: " + JSON.stringify(newRepostFeedActivity))
        const repostNotif = await Persistence.getNotification(me, NotificationType.REPOST, newPost, kurantoNoMichi)
        console.log("\nTry get new repost notification: " + JSON.stringify(repostNotif))

        await Persistence.unrepostPost(kurantoNoMichi, newPost)
        console.log("\nUnrepost done")
        await Persistence.repostHook(kurantoNoMichi, newPost, false)
        console.log("\nUnrepost hook done")
        const newNewPostReposts = await Persistence.getPostReposts(newPost)
        console.log("\nNew post reposts: " + JSON.stringify(newNewPostReposts.map((user) => user.id)))
        const newNewRepostFeedActivity = await Persistence.getFeedActivity(kurantoNoMichi, newPost, FeedActivityType.REPOST)
        console.log("\nTry get new repost feed activity: " + JSON.stringify(newNewRepostFeedActivity))
        const newRepostNotif = await Persistence.getNotification(me, NotificationType.REPOST, newPost, kurantoNoMichi)
        console.log("\nTry get new repost notification: " + JSON.stringify(newRepostNotif))

        await Persistence.likePost(kurantoNoMichi, newPost)
        console.log("\nRelike done")

        const newReply = await Persistence.postOrReply(
            kurantoNoMichi,
            "This is a very long reply that should exceed the number of characters alloted to the preview. I think it's supposed to be 420, which is symbolic because Twitter started off with 140, then got extended to 280. It's only natural that we go to 420 from here. 420, you say. I know what you're thinking, but hold that thought. Wow, the 420 char limit is longer than I thought. How am I still not done? Well, in any case, I'm hopeful you peeps will make good use of all this space.",
            newPost)
        console.log("\nInserted new reply: " + JSON.stringify(newReply))
        const newReplyFeedActivity = await Persistence.postOrReplyHook(newReply, newPost)
        console.log("\nInserted new reply feed activity: " + JSON.stringify(newReplyFeedActivity))
        const newReplyNotif = await Persistence.getNotification(me, NotificationType.REPLY, newReply, kurantoNoMichi)
        console.log("\nTry get new reply notification: " + JSON.stringify(newReplyNotif))

        const deletedParentPost = await Persistence.deletePost(newPost)
        console.log("\nDeleted parent post: " + JSON.stringify(deletedParentPost))
        const currentReply = await Persistence.getPostByID(newReply.id)
        console.log("\nTry get reply: " + JSON.stringify(currentReply))
        const deletedParentPostFeedActivity = await Persistence.getFeedActivity(me, newPost, FeedActivityType.POST)
        console.log("\nTry get parent post feed activity: " + JSON.stringify(deletedParentPostFeedActivity))
        const deletedParentPostLikeFeedActivity = await Persistence.getFeedActivity(kurantoNoMichi, newPost, FeedActivityType.LIKE)
        console.log("\nTry get parent post like feed activity: " + JSON.stringify(deletedParentPostLikeFeedActivity))
        const deletedParentPostLikeNotification = await Persistence.getNotification(me, NotificationType.LIKE, newPost, kurantoNoMichi)
        console.log("\nTry get parent post like notification: " + JSON.stringify(deletedParentPostLikeNotification))
        const deletedParentPostReplyNotification = await Persistence.getNotification(me, NotificationType.REPLY, newReply, kurantoNoMichi)
        console.log("\nTry get parent post new reply notification: " + JSON.stringify(deletedParentPostReplyNotification))

        console.log("\n\n\n===DM===")

        await Persistence.clearDB()
        console.log("\nDB cleared")

        const saved_number_of_retrievable_dm_s = consts.NUMBER_OF_RETRIEVABLE_DM_S
        consts.NUMBER_OF_RETRIEVABLE_DM_S = 2

        await Persistence.insertUser(me)
        console.log("\ninserted sender user: " + JSON.stringify(me))

        await Persistence.insertUser(kurantoNoMichi)
        console.log("\ninserted receiver user: " + JSON.stringify(kurantoNoMichi))

        const dm = await Persistence.sendDM(me, kurantoNoMichi, "Howdy")
        console.log("\nuser1 sent DM: " + JSON.stringify(dm))
        let dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
        console.log("\nDM bank: " + JSON.stringify(dmBank))

        const dm2 = await Persistence.sendDM(kurantoNoMichi, me, "Yo")
        console.log("\nuser2 sent DM: " + JSON.stringify(dm2))
        dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
        console.log("\nDM bank: " + JSON.stringify(dmBank))

        const dm3 = await Persistence.sendDM(me, kurantoNoMichi, "Howdy howdy")
        console.log("\nuser1 sent DM: " + JSON.stringify(dm3))
        dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
        console.log("\nDM bank: " + JSON.stringify(dmBank))

        const dm4 = await Persistence.sendDM(kurantoNoMichi, me, "What is it?")
        console.log("\nuser2 sent DM: " + JSON.stringify(dm4))
        dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
        console.log("\nDM bank: " + JSON.stringify(dmBank))

        const dm5 = await Persistence.sendDM(kurantoNoMichi, me, "Speak up")
        console.log("\nuser2 sent DM: " + JSON.stringify(dm5))
        dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
        console.log("\nDM bank: " + JSON.stringify(dmBank))

        const dm6 = await Persistence.sendDM(me, kurantoNoMichi, "Nothing")
        console.log("\nuser1 sent DM: " + JSON.stringify(dm6))
        dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
        console.log("\nDM bank: " + JSON.stringify(dmBank))

        const dm7 = await Persistence.sendDM(me, kurantoNoMichi, "Bye")
        console.log("\nuser1 sent DM: " + JSON.stringify(dm7))
        dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
        console.log("\nDM bank: " + JSON.stringify(dmBank))

        await Persistence.deleteDM(dm)
        await Persistence.deleteDM(dm3)
        await Persistence.deleteDM(dm6)
        await Persistence.deleteDM(dm7)
        console.log("\nUser 1 deleted all DMs.")
        dmBank = await Persistence.getOneOnOneDMs(me.id, kurantoNoMichi.id)
        console.log("\nDM bank: " + JSON.stringify(dmBank))

        const savedDmSenderID = me.id
        await Persistence.deleteUser(me)
        console.log("\nDeleted user1")
        dmBank = await Persistence.getOneOnOneDMs(savedDmSenderID, kurantoNoMichi.id)
        console.log("\nDM bank: " + JSON.stringify(dmBank))

        const savedDmRecipientID = kurantoNoMichi.id
        await Persistence.deleteUser(kurantoNoMichi)
        console.log("\nDeleted user2")
        dmBank = await Persistence.getOneOnOneDMs(savedDmSenderID, savedDmRecipientID)
        console.log("\nDM bank: " + JSON.stringify(dmBank))

        consts.NUMBER_OF_RETRIEVABLE_DM_S = saved_number_of_retrievable_dm_s

        console.log("\n\n\n===Clear DB===")

        await Persistence.clearDB()
        console.log("\nDB cleared")
    }).catch(error => console.log(error))
}