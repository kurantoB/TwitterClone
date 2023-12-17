import consts from "./consts"

export function removeLinksFromMarkdown(markdown: string) {
    return markdown.replaceAll('[', '\\[')
        .replaceAll(/<a[\s\n\t\r\f]+[^>]+>/g, '')
        .replaceAll(/<\/a[\s\n\t\r\f]*>/g, '')
}

export function processTags(markdown: string): [string, string[]] {
    const hashtagOccurrences: number[][] = []
    const hashtags: string[] = []

    const userTagOccurrences: number[][] = []

    // hashtags
    for (let i = 0; i < markdown.length; i++) {
        if (markdown[i] === '#' && i < markdown.length - 1) {
            if (i > 0 && !/[\s\n\t\r\f\*_]/.test(markdown.charAt(i - 1))) {
                // whitespace must precede hashtag
                continue
            }
            // find start of hashtag content
            let j = i + 1
            if (i < markdown.length - 2 && markdown[i + 1] === '#') {
                j = i + 2
            }

            const startOfContent = j
            for (; j < markdown.length; j++) {
                if (
                    markdown.charCodeAt(j) >= 0
                    && markdown.charCodeAt(j) < 128
                    && !(
                        (
                            // numerical
                            markdown.charCodeAt(j) >= 48
                            && markdown.charCodeAt(j) < 58
                        )
                        || (
                            // uppercase
                            markdown.charCodeAt(j) >= 65
                            && markdown.charCodeAt(j) < 91
                        )
                        || (
                            // lowercase
                            markdown.charCodeAt(j) >= 97
                            && markdown.charCodeAt(j) < 123
                        )
                    )
                ) {
                    // encountered plain text character that's not a hashtag char

                    // push new occurrence if not empty hashtag and is within hashtag max length
                    if (j !== startOfContent && j - startOfContent <= consts.MAX_HASHTAG_LENGTH) {
                        hashtagOccurrences.push([i, j])
                        hashtags.push(markdown.substring(i, j).toLowerCase())
                    }

                    i = j
                    break
                } else if (j === markdown.length - 1) {
                    // encountered end of markdown
                    if (j + 1 - startOfContent <= consts.MAX_HASHTAG_LENGTH) {
                        hashtagOccurrences.push([i, j + 1])
                        hashtags.push(markdown.substring(i, j + 1).toLowerCase())
                    }
                    i = j
                }
            }
        }
    }

    let builder = ""
    let cursor = 0
    for (const occurrence of hashtagOccurrences) {
        builder +=
            markdown.substring(cursor, occurrence[0])
            + `[${markdown.substring(occurrence[0], occurrence[1])}]`
            + `(${window.location.origin}/hashtag/${encodeURIComponent(markdown.substring(occurrence[0], occurrence[1]).toLowerCase())})`
        cursor = occurrence[1]
    }
    builder += markdown.substring(cursor)

    markdown = builder

    // user tags
    for (let i = 0; i < markdown.length; i++) {
        if (markdown[i] === '@' && i < markdown.length - 1) {
            if (i > 0 && !/[\s\n\t\r\f\*_]/.test(markdown.charAt(i - 1))) {
                // whitespace must precede user tag
                continue
            }
            // start of user tag content
            let j = i + 1
            
            const startOfContent = j
            for (; j < markdown.length; j++) {
                if (
                    markdown.charCodeAt(j) >= 0
                    && markdown.charCodeAt(j) < 128
                    && !(
                        (
                            // numerical
                            markdown.charCodeAt(j) >= 48
                            && markdown.charCodeAt(j) < 58
                        )
                        || (
                            // uppercase
                            markdown.charCodeAt(j) >= 65
                            && markdown.charCodeAt(j) < 91
                        )
                        || (
                            // lowercase
                            markdown.charCodeAt(j) >= 97
                            && markdown.charCodeAt(j) < 123
                        )
                        // underscore
                        || markdown.charCodeAt(j) === 95
                    )
                ) {
                    // encountered plain text character that's not a user tag char

                    // push new occurrence if not empty user tag and is within user tag max length
                    if (j - startOfContent >= 4 && j - startOfContent <= consts.MAX_USERNAME_LENGTH) {
                        userTagOccurrences.push([i, j])
                    }

                    i = j
                    break
                } else if (j === markdown.length - 1) {
                    // encountered end of markdown
                    if (j + 1 - startOfContent >= 4 && j + 1 - startOfContent <= consts.MAX_USERNAME_LENGTH) {
                        userTagOccurrences.push([i, j + 1])
                    }
                    i = j
                }
            }
        }
    }

    builder = ""
    cursor = 0
    for (const occurrence of userTagOccurrences) {
        builder +=
            markdown.substring(cursor, occurrence[0])
            + `[${markdown.substring(occurrence[0], occurrence[1])}]`.replaceAll(/_/g, '\\_')
            + `(${window.location.origin}/u/${markdown.substring(occurrence[0] + 1, occurrence[1])})`
        cursor = occurrence[1]
    }
    builder += markdown.substring(cursor)

    return [builder, hashtags]
}