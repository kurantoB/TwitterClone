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

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "34.69.52.241",
    port: 5432,
    username: "dbuser",
    password: "kwafcsn",
    database: "postgres",
    synchronize: true,
    logging: false,
    entities: [FeedActivity, User, Post, Notification, DM, Hashtag, TagSubscription, PostToParentMapping],
    migrations: [],
    subscribers: [],
    extra: {
        poolSize: 2
    }
})
