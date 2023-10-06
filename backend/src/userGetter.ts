import * as Persistence from './persistence'

export default async function getUserId(googleid: string) {
    return await Persistence.getUser(googleid).then((user) => {
        return user?.id
    })
}