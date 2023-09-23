import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryColumn } from "typeorm"
import { User } from "./User"
import { Post } from "./Post"

export enum FeedActivityType {
    POST = "post",
    REPOST = "repost",
    LIKE = "like"
}

@Entity()
export class FeedActivity {
    @PrimaryColumn({ type: 'varchar' })
    @ManyToOne(
        () => User,
        { onDelete: "CASCADE" }
    )
    @Index()
    sourceUser: User

    @PrimaryColumn({ type: 'varchar' })
    @ManyToOne(
        () => Post,
        { onDelete: "CASCADE" }
    )
    sourcePost: Post

    @PrimaryColumn({
        type: "enum",
        enum: FeedActivityType
    })
    type: FeedActivityType

    @CreateDateColumn({ type: "timestamptz" })
    createTime: Date

    @Column({ type: "timestamptz" })
    expiryDate: Date
}