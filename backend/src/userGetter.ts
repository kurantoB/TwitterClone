import * as Persistence from './persistence'

export default async function getUserId(googleid: string) {
    return await Persistence.getUser(googleid).then((user) => {
        if (user) {
            return user.id
        } else {
            throw new Error("User not found for Google ID")
        }
    })
}