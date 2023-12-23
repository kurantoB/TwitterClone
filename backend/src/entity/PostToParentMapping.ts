import { Entity, Index, JoinTable, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Post } from "./Post";

@Entity()
export class PostToParentMapping {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @ManyToOne(
        () => Post,
        (post) => post.parentMappings,
        {
            onDelete: 'CASCADE'
        }
    )
    @Index()
    post: Post

    @ManyToOne(
        () => Post,
        (post) => post.replyMappings,
        {
            onDelete: 'SET NULL',
            nullable: true
        },
    )
    @JoinTable()
    @Index()
    parent: Post
}