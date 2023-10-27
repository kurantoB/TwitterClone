import { AppDataSource } from "../data-source";
import { User } from "../entity/User";


export async function getSharedMutuals(id: string, targetUserId: string, offset: number, amount: number) {
    // get handles in both my mutuals and their mutuals
    return await AppDataSource
        .getRepository(User)
        .createQueryBuilder("user")
        .select("user.username")
        .where((qb) => {
            // my mutuals
            const subQuery = qb
                .subQuery()
                .select("follower.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.followers", "follower")
                .innerJoin("sourceuser.following", "following", "following.id = follower.id")
                .where("sourceuser.id = :id", { id })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .andWhere((qb) => {
            // their mutuals
            const subQuery = qb
                .subQuery()
                .select("follower.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.followers", "follower")
                .innerJoin("sourceuser.following", "following", "following.id = follower.id")
                .where("sourceuser.id = :targetUserId", { targetUserId })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .orderBy("user.createTime", "ASC")
        .skip(offset)
        .take(amount)
        .getRawMany()
        .then((rawValues) => rawValues.map((rawValue) => rawValue["user_username"]));
}

export async function getMutualsFollowingYou(id: string, targetUserId: string, offset: number, amount: number) {
    // get handles in my followers and not in my following. Intersect that with their mutuals
    return await AppDataSource
        .getRepository(User)
        .createQueryBuilder("user")
        .select("user.username")
        .where((followersNotFollowingQb) => {
            // my followers and not my following
            const subQuery = followersNotFollowingQb
                .subQuery()
                .select("follower.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.followers", "follower")
                .where("sourceuser.id = :id", { id })
                .andWhere((notFollowingQb) => {
                    // not my following
                    const subQuery = notFollowingQb
                        .subQuery()
                        .select("following.id")
                        .from(User, "sourceuser2")
                        .innerJoin("sourceuser2.following", "following")
                        .where("sourceuser2.id = sourceuser.id")
                        .getQuery();
                    return "follower.id NOT IN " + subQuery;
                })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .andWhere((qb) => {
            // their mutuals
            const subQuery = qb
                .subQuery()
                .select("follower.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.followers", "follower")
                .innerJoin("sourceuser.following", "following", "following.id = follower.id")
                .where("sourceuser.id = :targetUserId", { targetUserId })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .orderBy("user.createTime", "ASC")
        .skip(offset)
        .take(amount)
        .getRawMany()
        .then((rawValues) => rawValues.map((rawValue) => rawValue["user_username"]));
}

export async function getMutualsYouFollow(id: string, targetUserId: string, offset: number, amount: number) {
    // get handles in my following and not in my followers. Intersect that with their mutuals
    return await AppDataSource
        .getRepository(User)
        .createQueryBuilder("user")
        .select("user.username")
        .where((followingNotFollowersQb) => {
            // my following and not my followers
            const subQuery = followingNotFollowersQb
                .subQuery()
                .select("following.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.following", "following")
                .where("sourceuser.id = :id", { id })
                .andWhere((notFollowersQb) => {
                    // not my followers
                    const subQuery = notFollowersQb
                        .subQuery()
                        .select("follower.id")
                        .from(User, "sourceuser2")
                        .innerJoin("sourceuser2.followers", "follower")
                        .where("sourceuser2.id = sourceuser.id")
                        .getQuery();
                    return "following.id NOT IN " + subQuery;
                })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .andWhere((qb) => {
            // their mutuals
            const subQuery = qb
                .subQuery()
                .select("follower.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.followers", "follower")
                .innerJoin("sourceuser.following", "following", "following.id = follower.id")
                .where("sourceuser.id = :targetUserId", { targetUserId })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .orderBy("user.createTime", "ASC")
        .skip(offset)
        .take(amount)
        .getRawMany()
        .then((rawValues) => rawValues.map((rawValue) => rawValue["user_username"]));
}

export async function getUnacquaintedMutuals(id: string, targetUserId: string, offset: number, amount: number) {
    // get handles not in my followers and not in my following. Intersect that with their mutuals
    return await AppDataSource
        .getRepository(User)
        .createQueryBuilder("user")
        .select("user.username")
        .where((qb) => {
            // not my followers
            const subQuery = qb
                .subQuery()
                .select("follower.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.followers", "follower")
                .where("sourceuser.id = :id", { id })
                .getQuery();
            return "user.id NOT IN " + subQuery;
        })
        .andWhere((qb) => {
            // not my following
            const subQuery = qb
                .subQuery()
                .select("following.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.following", "following")
                .where("sourceuser.id = :id2", { id2: id })
                .getQuery();
            return "user.id NOT IN " + subQuery;
        })
        .andWhere((qb) => {
            // their mutuals
            const subQuery = qb
                .subQuery()
                .select("follower.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.followers", "follower")
                .innerJoin("sourceuser.following", "following", "following.id = follower.id")
                .where("sourceuser.id = :targetUserId", { targetUserId })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .orderBy("user.createTime", "ASC")
        .skip(offset)
        .take(amount)
        .getRawMany()
        .then((rawValues) => rawValues.map((rawValue) => rawValue["user_username"]));
}

export async function getCommonFollowers(id: string, targetUserId: string, offset: number, amount: number) {
    // get handles in my followers. Intersect that with their followers who are not in their following
    return await AppDataSource
        .getRepository(User)
        .createQueryBuilder("user")
        .select("user.username")
        .where((qb) => {
            // my followers
            const subQuery = qb
                .subQuery()
                .select("follower.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.followers", "follower")
                .where("sourceuser.id = :id", { id })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .andWhere((followersNotFollowingQb) => {
            // their followers and not their following
            const subQuery = followersNotFollowingQb
                .subQuery()
                .select("follower.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.followers", "follower")
                .where("sourceuser.id = :targetUserId", { targetUserId })
                .andWhere((notFollowingQb) => {
                    // not their following
                    const subQuery = notFollowingQb
                        .subQuery()
                        .select("following.id")
                        .from(User, "sourceuser2")
                        .innerJoin("sourceuser2.following", "following")
                        .where("sourceuser2.id = sourceuser.id")
                        .getQuery();
                    return "follower.id NOT IN " + subQuery;
                })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .orderBy("user.createTime", "ASC")
        .skip(offset)
        .take(amount)
        .getRawMany()
        .then((rawValues) => rawValues.map((rawValue) => rawValue["user_username"]));
}

export async function getSpecificFollowers(id: string, targetUserId: string, offset: number, amount: number) {
    // get handles in my followers. Exclude them from their followers who are not in their following
    return await AppDataSource
        .getRepository(User)
        .createQueryBuilder("user")
        .select("user.username")
        .where((qb) => {
            // my followers
            const subQuery = qb
                .subQuery()
                .select("follower.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.followers", "follower")
                .where("sourceuser.id = :id", { id })
                .getQuery();
            return "user.id NOT IN " + subQuery;
        })
        .andWhere((followersNotFollowingQb) => {
            // their followers and not their following
            const subQuery = followersNotFollowingQb
                .subQuery()
                .select("follower.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.followers", "follower")
                .where("sourceuser.id = :targetUserId", { targetUserId })
                .andWhere((notFollowingQb) => {
                    // not their following
                    const subQuery = notFollowingQb
                        .subQuery()
                        .select("following.id")
                        .from(User, "sourceuser2")
                        .innerJoin("sourceuser2.following", "following")
                        .where("sourceuser2.id = sourceuser.id")
                        .getQuery();
                    return "follower.id NOT IN " + subQuery;
                })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .orderBy("user.createTime", "ASC")
        .skip(offset)
        .take(amount)
        .getRawMany()
        .then((rawValues) => rawValues.map((rawValue) => rawValue["user_username"]));
}

export async function getCommonFollowing(id: string, targetUserId: string, offset: number, amount: number) {
    // get handles in my following. Intersect that with their following who are not in their followers
    return await AppDataSource
        .getRepository(User)
        .createQueryBuilder("user")
        .select("user.username")
        .where((qb) => {
            // my following
            const subQuery = qb
                .subQuery()
                .select("following.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.following", "following")
                .where("sourceuser.id = :id", { id })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .andWhere((followingNotFollowersQb) => {
            // their following and not their followers
            const subQuery = followingNotFollowersQb
                .subQuery()
                .select("following.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.following", "following")
                .where("sourceuser.id = :targetUserId", { targetUserId })
                .andWhere((notFollowersQb) => {
                    // not their followers
                    const subQuery = notFollowersQb
                        .subQuery()
                        .select("follower.id")
                        .from(User, "sourceuser2")
                        .innerJoin("sourceuser2.followers", "follower")
                        .where("sourceuser2.id = sourceuser.id")
                        .getQuery();
                    return "following.id NOT IN " + subQuery;
                })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .orderBy("user.createTime", "ASC")
        .skip(offset)
        .take(amount)
        .getRawMany()
        .then((rawValues) => rawValues.map((rawValue) => rawValue["user_username"]));
}

export async function getSpecificFollowing(id: string, targetUserId: string, offset: number, amount: number) {
    // get handles in my following. Exclude them from their following who are not in their followers
    return await AppDataSource
        .getRepository(User)
        .createQueryBuilder("user")
        .select("user.username")
        .where((qb) => {
            // my following
            const subQuery = qb
                .subQuery()
                .select("following.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.following", "following")
                .where("sourceuser.id = :id", { id })
                .getQuery();
            return "user.id NOT IN " + subQuery;
        })
        .andWhere((followingNotFollowersQb) => {
            // their following and not their followers
            const subQuery = followingNotFollowersQb
                .subQuery()
                .select("following.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.following", "following")
                .where("sourceuser.id = :targetUserId", { targetUserId })
                .andWhere((notFollowersQb) => {
                    // not their followers
                    const subQuery = notFollowersQb
                        .subQuery()
                        .select("follower.id")
                        .from(User, "sourceuser2")
                        .innerJoin("sourceuser2.followers", "follower")
                        .where("sourceuser2.id = sourceuser.id")
                        .getQuery();
                    return "following.id NOT IN " + subQuery;
                })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .orderBy("user.createTime", "ASC")
        .skip(offset)
        .take(amount)
        .getRawMany()
        .then((rawValues) => rawValues.map((rawValue) => rawValue["user_username"]));
}

export async function getAllMutuals(id: string, offset: number, amount: number) {
    // get handles in my mutuals
    return await AppDataSource
        .getRepository(User)
        .createQueryBuilder("user")
        .select("user.username")
        .where((qb) => {
            // my mutuals
            const subQuery = qb
                .subQuery()
                .select("follower.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.followers", "follower")
                .innerJoin("sourceuser.following", "following", "following.id = follower.id")
                .where("sourceuser.id = :id", { id })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .orderBy("user.createTime", "ASC")
        .skip(offset)
        .take(amount)
        .getRawMany()
        .then((rawValues) => rawValues.map((rawValue) => rawValue["user_username"]));
}

export async function getAllFollowers(id: string, offset: number, amount: number) {
    // get handles in my followers that are not in my mutuals
    return await AppDataSource
        .getRepository(User)
        .createQueryBuilder("user")
        .select("user.username")
        .where((qb) => {
            // not my mutuals
            const subQuery = qb
                .subQuery()
                .select("follower.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.followers", "follower")
                .innerJoin("sourceuser.following", "following", "following.id = follower.id")
                .where("sourceuser.id = :id", { id })
                .getQuery();
            return "user.id NOT IN " + subQuery;
        })
        .andWhere((qb) => {
            // my followers
            const subQuery = qb
                .subQuery()
                .select("follower.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.followers", "follower")
                .where("sourceuser.id = :id2", { id2: id })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .orderBy("user.createTime", "ASC")
        .skip(offset)
        .take(amount)
        .getRawMany()
        .then((rawValues) => rawValues.map((rawValue) => rawValue["user_username"]));
}

export async function getAllFollowing(id: string, offset: number, amount: number) {
    // get handles in my following that are not in my mutuals
    return await AppDataSource
        .getRepository(User)
        .createQueryBuilder("user")
        .select("user.username")
        .where((qb) => {
            // not my mutuals
            const subQuery = qb
                .subQuery()
                .select("follower.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.followers", "follower")
                .innerJoin("sourceuser.following", "following", "following.id = follower.id")
                .where("sourceuser.id = :id", { id })
                .getQuery();
            return "user.id NOT IN " + subQuery;
        })
        .andWhere((qb) => {
            // my following
            const subQuery = qb
                .subQuery()
                .select("following.id")
                .from(User, "sourceuser")
                .innerJoin("sourceuser.following", "following")
                .where("sourceuser.id = :id2", { id2: id })
                .getQuery();
            return "user.id IN " + subQuery;
        })
        .orderBy("user.createTime", "ASC")
        .skip(offset)
        .take(amount)
        .getRawMany()
        .then((rawValues) => rawValues.map((rawValue) => rawValue["user_username"]));
}