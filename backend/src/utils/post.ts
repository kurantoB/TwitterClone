import { Post } from "../entity/Post";
import { AppDataSource } from "../data-source";
import { PostToParentMapping } from "../entity/PostToParentMapping";

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