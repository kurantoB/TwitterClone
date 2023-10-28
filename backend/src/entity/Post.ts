import { Column, CreateDateColumn, Entity, Index, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { User } from "./User"
import consts from "../consts"

export enum VisibilityType {
    FRIENDS,
    MUTUALS,
    EVERYONE
}

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

    // can be null if the post is media only
    @Column("varchar", {
        length: consts.MAX_POST_PREVIEW_LENGTH,
        nullable: true
    })
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

    @Column({
        nullable: true
    })
    parentPostIds: string

    @Column({
        nullable: true
    })
    media: string

    @Column({
        type: "enum",
        enum: VisibilityType
    })
    visibility: VisibilityType

    @CreateDateColumn({ type: "timestamptz" })
    createTime: Date
}