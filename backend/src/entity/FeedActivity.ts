import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { User } from "./User"
import { Post } from "./Post"

export enum FeedActivityType {
    POST = "post",
    REPOST = "repost",
    LIKE = "like"
}

@Entity()
export class FeedActivity {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @ManyToOne(
        () => User,
        {
            onDelete: "CASCADE",
            eager: true
        }
    )
    @Index()
    sourceUser: User

    @ManyToOne(
        () => Post,
        {
            onDelete: "CASCADE",
            eager: true
        }
    )
    sourcePost: Post

    @Column({
        type: "enum",
        enum: FeedActivityType
    })
    type: FeedActivityType

    @CreateDateColumn({ type: "timestamptz" })
    @Index()
    createTime: Date

    @Column({ type: "timestamptz" })
    @Index()
    expiryDate: Date
}