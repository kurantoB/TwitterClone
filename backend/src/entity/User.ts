import { Entity, Column, Index, ManyToMany, JoinTable, CreateDateColumn, PrimaryGeneratedColumn, OneToMany } from "typeorm"
import consts from "../consts"
import { TagSubscription } from "./TagSubscription"

@Entity()
export class User {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({ type: 'varchar' })
    @Index({ unique: true })
    googleid: string

    @Column({ type: 'varchar' })
    @Index( {unique: true })
    username: string

    @Column({ nullable: true })
    avatar: string

    @Column({ type: "text" })
    bio: string

    @Column({ type: 'varchar' })
    shortBio: string

    @ManyToMany(
        () => User,
        (user) => user.following
    )
    @JoinTable()
    followers: User[]

    @ManyToMany(
        () => User,
        (user) => user.followers
    )
    following: User[]

    @ManyToMany(
        () => User,
        (user) => user.befriendedBy
    )
    @JoinTable()
    friends: User[]

    @ManyToMany(
        () => User,
        (user) => user.friends
    )
    befriendedBy: User[]

    @Column({
        type: "int",
        default: 0
    })
    followerCount: number

    @Column({
        type: "int",
        default: 0
    })
    followingCount: number

    @Column({
        type: "int",
        default: 0
    })
    mutualCount: number

    @ManyToMany(() => User)
    @JoinTable()
    blockedUsers: User[]

    @OneToMany(
        () => TagSubscription,
        (tagsub) => tagsub.user,
        { onDelete: "CASCADE" }
    )
    tagsubs: TagSubscription[]

    @CreateDateColumn({ type: "timestamptz" })
    createTime: Date
}
