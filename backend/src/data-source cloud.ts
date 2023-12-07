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
    host: process.env.TYPEORM_HOST,
    // port: 5432,
    username: process.env.TYPEORM_USERNAME,
    password: process.env.TYPEORM_PASSWORD,
    database: process.env.TYPEORM_DATABASE,
    synchronize: true,
    logging: false,
    entities: [FeedActivity, User, Post, Notification, DM, Hashtag, TagSubscription, PostToParentMapping],
    migrations: [],
    subscribers: [],
    extra: {
        poolSize: 2
    }
})
