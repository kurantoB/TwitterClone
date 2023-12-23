import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn,  } from "typeorm"
import { User } from "./User"
import { Post } from "./Post"

export enum NotificationType {
    FOLLOW = "follow",
    LIKE = "like",
    REPOST = "repost",
    REPLY = "reply",
    FRIENDING = "friending",
    ACTION_TAKEN = "action_taken"
}

@Entity()
export class Notification {
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
    user: User

    @Column({
        type: "enum",
        enum: NotificationType
    })
    type: NotificationType

    @ManyToOne(
        () => Post, 
        {
            nullable: true,
            onDelete: "CASCADE",
            eager: true
        }
    )
    sourcePost: Post

    @ManyToOne(
        () => User,
        {
            onDelete: "CASCADE",
            eager: true,
            nullable: true
        }
    )
    sourceUser: User

    @Column({ default: false })
    isSeen: boolean

    @CreateDateColumn({ type: "timestamptz" })
    @Index()
    createTime: Date

    @Column({ type: "timestamptz" })
    @Index()
    expiryDate: Date
}