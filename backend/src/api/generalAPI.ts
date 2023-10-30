import { SAFE_SEARCH_CLIENT } from '../index'
import * as Persistence from '../persistence'

export async function getUserHasAvatar(googleid: string) {
    return Persistence.getUserAvatar(googleid).then((avatar) => (avatar ? true : false))
}

export async function safeSearchImage(filepath: string) {
    const [safeSearchResult] = await SAFE_SEARCH_CLIENT.safeSearchDetection(filepath)
    if (!safeSearchResult) {
        return true
    }
    const safeSearchAnnotation = safeSearchResult.safeSearchAnnotation
    
    return ![safeSearchAnnotation["adult"], safeSearchAnnotation["medical"], safeSearchAnnotation["violence"]]
        .some((result) => result === "LIKELY" || result === "VERY_LIKELY")
}