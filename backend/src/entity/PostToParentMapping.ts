import { Entity, Index, JoinTable, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Post } from "./Post";

@Entity()
export class PostToParentMapping {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @ManyToOne(
        () => Post,
        (post) => post.parentMappings
    )
    @Index()
    post: Post

    @ManyToOne(
        () => Post,
        (post) => post.replyMappings,
        { nullable: true }
    )
    @JoinTable()
    @Index()
    parent: Post
}