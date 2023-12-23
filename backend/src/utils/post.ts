import { Post } from "../entity/Post";
import { AppDataSource } from "../data-source";
import { PostToParentMapping } from "../entity/PostToParentMapping";
import { PostReport } from "../entity/PostReport";
import { deleteMedia } from "./general";
import consts from "../consts";
import { ActionTaken } from "../entity/ActionTaken";
import { MoreThan } from "typeorm";
import { deletePost, DeleteUserResult, deleteUser } from "../persistence";

export function replyMappingsSQB(postId: string) {
    return AppDataSource
        .getRepository(PostToParentMapping)
        .createQueryBuilder("mapping")
        .select("mapping")
        .innerJoin("mapping.parent", "parent")
        .where("parent.id = :postId", { postId })
}

export function likingUsersSQB(postId: string) {
    return AppDataSource
        .getRepository(Post)
        .createQueryBuilder("post")
        .select("liking")
        .innerJoinAndSelect("post.likedBy", "liking")
        .where("post.id = :postId", { postId })
}

export function repostingUsersSQB(postId: string) {
    return AppDataSource
        .getRepository(Post)
        .createQueryBuilder("post")
        .select("reposter")
        .innerJoinAndSelect("post.reposters", "reposter")
        .where("post.id = :postId", { postId })
}

export async function takeActionOnReport(report: PostReport): Promise<DeleteUserResult | undefined> {
    if (report.post.media) {
        await deleteMedia(consts.CLOUD_STORAGE_POSTMEDIA_BUCKETNAME, report.post.id + "_media")
    }
    await deletePost(report.post)

    const currentTimeInMilliseconds = new Date().getTime()
    const newTimeInMilliseconds = currentTimeInMilliseconds - (86400000 * consts.ACCOUNT_TOLERANCE_DURATION_DAYS)
    const newDate = new Date(newTimeInMilliseconds)
    const actionsTaken = await AppDataSource.getRepository(ActionTaken).countBy({
        targetUser: report.reportee,
        actionTime: MoreThan(newDate)
    })
    let delResult: DeleteUserResult
    if (actionsTaken >= consts.ACCOUNT_TOLERANCE_QUANTITY) {
        // delete account if tolerance level is exceeded
        delResult = await deleteUser(report.reportee.googleid)
    } else {
        const actionTaken = new ActionTaken()
        actionTaken.targetUser = report.reportee
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + consts.ACTION_TAKEN_EXPIRY_DAYS)
        actionTaken.expiryDate = expiryDate
        await AppDataSource.getRepository(ActionTaken).save(actionTaken)
    }

    await AppDataSource.getRepository(PostReport).remove(report)
    return delResult
}