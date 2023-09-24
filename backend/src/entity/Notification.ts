import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn,  } from "typeorm"
import { User } from "./User"
import { Post } from "./Post"

export enum NotificationType {
    FOLLOW = "follow",
    LIKE = "like",
    REPOST = "repost",
    REPLY = "reply"
}

@Entity()
export class Notification {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @ManyToOne(
        () => User,
        { onDelete: "CASCADE" }
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
            onDelete: "CASCADE"
        }
    )
    sourcePost: Post

    @ManyToOne(
        () => User,
        { onDelete: "CASCADE" }
    )
    sourceUser: User

    @Column({
        default: false
    })
    isSeen: boolean

    @CreateDateColumn({ type: "timestamptz" })
    createTime: Date

    @Column({ type: "timestamptz" })
    expiryDate: Date
}