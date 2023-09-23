import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "./entity/User"
import { Post } from "./entity/Post"
import { Notification } from "./entity/Notification"
import { FeedActivity } from "./entity/FeedActivity"
import { DM } from "./entity/DM"

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "kwafcsn",
    database: "test",
    synchronize: true,
    logging: false,
    entities: [FeedActivity, User, Post, Notification, DM],
    migrations: [],
    subscribers: [],
})
