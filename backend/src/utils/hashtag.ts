import consts from "../consts"

export function validateHashtags(hashtags: string, isPost: boolean): [string, string[]] {
    const tokenized = hashtags.split(/\s+/).filter((val) => val.length > 0)
    for (const token of tokenized) {
        if (token.length > consts.MAX_HASHTAG_LENGTH) {
            return [`Hashtags can not exceed ${consts.MAX_HASHTAG_LENGTH} characters.`, null]
        }
        if (token.startsWith('##')) {
            const formError = validateHashtagContent(token.substring(2))
            if (formError) {
                return [formError, null]
            }
        } else if (token.startsWith('#')) {
            const formError = validateHashtagContent(token.substring(1))
            if (formError) {
                return [formError, null]
            }
        } else {
            return ["Hashtags must be of the format # or ## followed by a non-empty string.", null]
        }
    }
    return [null, tokenized]
}

function validateHashtagContent(hashtagContent: string) {
    if (hashtagContent.length === 0) {
        return "Hashtags must be of the format # or ## followed by a non-empty string."
    }
    for (let i = 0; i < hashtagContent.length; i++) {
        if (
            hashtagContent.charCodeAt(i) >= 0
            && hashtagContent.charCodeAt(i) < 128
            && !(
                (
                    // numerical
                    hashtagContent.charCodeAt(i) >= 48
                    && hashtagContent.charCodeAt(i) < 58
                )
                || (
                    // lowercase
                    hashtagContent.charCodeAt(i) >= 97
                    && hashtagContent.charCodeAt(i) < 123
                )
            ) 
        ) {
            return "Hashtags can only be alphanumeric and all lowercase unless non-plain-text characters are used."
        }
        return null
    }
}