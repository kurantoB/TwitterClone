import { Entity, Column, Index, ManyToMany, JoinTable, CreateDateColumn, PrimaryGeneratedColumn } from "typeorm"
import consts from "../consts"

@Entity()
export class User {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({ length: 21 })
    @Index({ unique: true })
    googleid: string

    @Column({ length: consts.MAX_USERNAME_LENGTH })
    @Index( {unique: true })
    username: string

    @Column({ nullable: true })
    avatar: string

    @Column({ type: "text" })
    bio: string

    @Column({ length: consts.MAX_SHORT_BIO_LENGTH })
    shortBio: string

    @ManyToMany(
        () => User,
        (user) => user.following,
    )
    @JoinTable()
    followers: User[]

    @ManyToMany(
        () => User,
        (user) => user.followers,
        { cascade: true }
    )
    following: User[]

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

    @CreateDateColumn({ type: "timestamptz" })
    createTime: Date
}
