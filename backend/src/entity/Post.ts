import { Column, CreateDateColumn, Entity, Index, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { User } from "./User"
import consts from "../consts"
import { PostToParentMapping } from "./PostToParentMapping"

export enum VisibilityType {
    FRIENDS = "FRIENDS",
    MUTUALS = "MUTUALS",
    EVERYONE = "EVERYONE"
}

@Entity()
export class Post {
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
    author: User

    // can be null if the post is media only
    @Column({
        type: 'varchar',
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

    @OneToMany(
        () => PostToParentMapping,
        (mapping) => mapping.post,
        {
            onDelete: "CASCADE",
            eager: true
        },
    )
    parentMappings: PostToParentMapping[]

    @OneToMany(
        () => PostToParentMapping,
        (mapping) => mapping.parent,
        { onDelete: "SET NULL" }
    )
    replyMappings: PostToParentMapping[]

    @Column({
        type: 'varchar',
        nullable: true
    })
    media: string

    @Column({
        type: "enum",
        enum: VisibilityType
    })
    visibility: VisibilityType

    @ManyToOne(
        () => User,
        { eager: true }
    )
    visibilityPerspective: User

    @CreateDateColumn({ type: "timestamptz" })
    @Index()
    createTime: Date
}