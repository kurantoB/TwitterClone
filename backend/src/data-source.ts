import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "./entity/User"
import { Post } from "./entity/Post"
import { Notification } from "./entity/Notification"
import { FeedActivity } from "./entity/FeedActivity"
import { DM } from "./entity/DM"
import { Hashtag } from "./entity/Hashtag"
import { TagSubscription } from "./entity/TagSubscription"
import { PostToParentMapping } from "./entity/PostToParentMapping"
import { DMSession } from "./entity/DMSession"

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "kwafcsn",
    database: "test",
    synchronize: true,
    logging: false,
    entities: [FeedActivity, User, Post, Notification, DM, DMSession, Hashtag, TagSubscription, PostToParentMapping],
    migrations: [],
    subscribers: [],
    extra: {
        poolSize: 2
    }
})
