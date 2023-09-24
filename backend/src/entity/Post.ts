import { Column, CreateDateColumn, Entity, Index, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { User } from "./User"
import consts from "../consts"

@Entity()
export class Post {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @ManyToOne(
        () => User,
        { onDelete: "CASCADE" }
    )
    @Index()
    author: User

    @Column("varchar", { length: consts.MAX_POST_PREVIEW_LENGTH })
    body: string

    // Do not select this when retrieving for the feed
    @Column({
        type: "text",
        nullable: true
    })
    extension: string

    @ManyToMany(() => User)
    @JoinTable()
    likedBy: User[]

    @ManyToMany(() => User)
    @JoinTable()
    reposters: User[]

    @OneToMany(
        () => Post,
        (post) => post.parentPost
    )
    replies: Post[]

    @ManyToOne(
        () => Post,
        (post) => post.replies,
        {
            onDelete: "SET NULL",
            nullable: true
        }
    )
    @Index()
    parentPost: Post

    @Column({
        default: false
    })
    isParentPostDeleted: boolean

    @Column({
        nullable: true
    })
    media: string

    @Column({
        nullable: true
    })
    compressedMedia: string

    @CreateDateColumn({ type: "timestamptz" })
    createTime: Date
}