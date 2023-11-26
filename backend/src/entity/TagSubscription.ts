import { Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Hashtag } from "./Hashtag";
import { User } from "./User";

@Entity()
export class TagSubscription {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @ManyToMany(() => Hashtag)
    ipTags: Hashtag[]

    @ManyToMany(() => Hashtag)
    subjectTags: Hashtag[]

    @ManyToOne(
        () => User,
        (user) => user.tagsubs
    )
    user: User
}