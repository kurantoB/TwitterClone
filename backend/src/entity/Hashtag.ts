import consts from "../consts";
import { Column, Entity, Index, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Post } from "./Post";

@Entity()
export class Hashtag {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column(
        "varchar",
        { length: consts.MAX_HASHTAG_LENGTH }
    )
    @Index({ unique: true })
    tag: string

    @ManyToMany(
        () => Post,
        (post) => post.hashtags
    )
    posts: Post[]
}