import consts from "../consts"

export function getHashtags(message: string) {
    // hashtags
    const hashtags: string[] = []
    for (let i = 0; i < message.length; i++) {
        if (message[i] === '#' && i < message.length - 1) {
            if (i > 0 && !/[\s\n\t\r\f]/.test(message.charAt(i - 1))) {
                // whitespace must precede hashtag
                continue
            }
            // find start of hashtag content
            let j = i + 1
            if (i < message.length - 2 && message[i + 1] === '#') {
                j = i + 2
            }

            const startOfContent = j
            for (; j < message.length; j++) {
                if (
                    message.charCodeAt(j) >= 0
                    && message.charCodeAt(j) < 128
                    && !(
                        (
                            // numerical
                            message.charCodeAt(j) >= 48
                            && message.charCodeAt(j) < 58
                        )
                        || (
                            // uppercase
                            message.charCodeAt(j) >= 65
                            && message.charCodeAt(j) < 91
                        )
                        || (
                            // lowercase
                            message.charCodeAt(j) >= 97
                            && message.charCodeAt(j) < 123
                        )
                    )
                ) {
                    // encountered plain text character that's not a hashtag char

                    // push new occurrence if not empty hashtag and is within hashtag max length
                    if (j !== startOfContent && j - startOfContent <= consts.MAX_HASHTAG_LENGTH) {
                        hashtags.push(message.substring(i, j).toLowerCase())
                    }

                    i = j
                    break
                } else if (j === message.length - 1) {
                    // encountered end of markdown
                    if (j + 1 - startOfContent <= consts.MAX_HASHTAG_LENGTH) {
                        hashtags.push(message.substring(i, j + 1).toLowerCase())
                    }
                    i = j
                }
            }
        }
    }

    return hashtags
}