import consts from "../consts";
import { Column, Entity, Index, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Post } from "./Post";

@Entity()
export class Hashtag {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({ type: 'varchar' })
    @Index({ unique: true })
    tag: string

    @ManyToMany(() => Post)
    @JoinTable()
    posts: Post[]
}