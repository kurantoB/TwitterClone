import { useState, useEffect } from 'react'
import doAPICall from '../app/apiLayer'
import { useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'
import MarkdownRenderer from './MarkdownRenderer'
import { processTags, removeLinksFromMarkdown } from '../utils'
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import { addErrorMessage } from '../app/appState'

export type DisplayedPostProps = {
    postId: string
    viewingUserGoogleId: string | null
    expanded: boolean
    showFlag: boolean
}

type Post = {
    author: User,
    body: string | null,
    extension: string | null,
    parentMappings: PostToParentMapping[],
    media: string | null,
    visibility: string,
    createTime: Date,
    numReplies: number,
    numLikes: number,
    numReposts: number,
    liked: boolean | null,
    reposted: boolean | null
}

type PostToParentMapping = {
    id: string
}

type User = {
    username: string,
    avatar: string | null,
}

TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')

export default function DisplayedPost({ postId, viewingUserGoogleId, expanded, showFlag }: DisplayedPostProps) {
    const [username, setUsername] = useState<string>("")
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [parentPostAuthors, setParentPostAuthors] = useState<User[]>([])
    const [visibility, setPostVisibility] = useState<string>("EVERYONE")
    const [postContents, setPostContents] = useState<string | null>(null)
    const [hasExtension, setHasExtension] = useState<boolean>(false)
    const [postMediaUrl, setPostMediaUrl] = useState<string | null>(null)
    const [createTime, setCreateTime] = useState<Date>(new Date())
    const [numReplies, setNumReplies] = useState<number>(0)
    const [numLikes, setNumLikes] = useState<number>(0)
    const [numReposts, setNumReposts] = useState<number>(0)
    const [liked, setLiked] = useState<boolean | null>(null)
    const [reposted, setReposted] = useState<boolean | null>(null)

    const dispatch = useDispatch()
    const navigate = useNavigate()
    const token = useAppSelector((state) => state.tokenId)

    if (!viewingUserGoogleId && showFlag) {
        dispatch(addErrorMessage("Not logged in user should not be able to flag posts."))
        navigate("/")
        return
    }

    useEffect(() => {
        doAPICall('GET', viewingUserGoogleId ? `/get-post-logged-in/${postId}` : `/get-post-public/${postId}`, dispatch, navigate, token, (body) => {
            const post: Post = body.post
            setUsername(post.author.username)
            setAvatarUrl(post.author.avatar)
            if (expanded) {
                setPostContents((post.body ? (post.extension ? post.body + post.extension : post.body) : null))
            } else {
                setPostContents(post.body)
            }
            setHasExtension(post.extension ? true : false)
            setPostMediaUrl(post.media)
            setPostVisibility(post.visibility)
            setCreateTime(post.createTime)

            setNumReplies(post.numReplies)
            setNumLikes(post.numLikes)
            setNumReposts(post.numReposts)

            if (viewingUserGoogleId) {
                setLiked(post.liked)
                setReposted(post.reposted)
            }

            if (post.parentMappings.length > 0) {
                const mappingIds = post.parentMappings
                    .map((mapping) => mapping.id)
                    .reduce((prev, curr) => `${prev},${curr}`)
                doAPICall('GET', `/get-parent-posts-from-mappings/${mappingIds}`, dispatch, navigate, token, (body) => {
                    const parentPosts: Post[] = body.posts
                    const parentPostAuthors = parentPosts
                        .map((parentPost) => parentPost.author)
                    setParentPostAuthors([...parentPostAuthors])
                })
            }
        })
    }, [])

    let parentPostUsernamesStr: string | null = null
    if (parentPostAuthors.length > 0) {
        parentPostUsernamesStr = parentPostAuthors
            .map((parentPostAuthor) => `@${parentPostAuthor.username}`)
            .reduce((prev, cur) => `${prev}, ${cur}`)
    }

    const postPreviewPreprocessed = postContents ? removeLinksFromMarkdown(postContents) : null
    const processedPostPreview = postPreviewPreprocessed ? processTags(postPreviewPreprocessed)[0] : null

    const flagPost = () => {
        doAPICall('PUT', `/report-post/${postId}`, dispatch, navigate, token, (body) => {
            dispatch(addErrorMessage(body.reportStatus))
            window.scrollTo({ top: 0, behavior: 'smooth' as ScrollBehavior })
        })
    }

    const likeClicked = () => {
        doAPICall('PUT', liked ? `/unlike-post/${postId}` : `/like-post/${postId}`, dispatch, navigate, token, (body) => {
            if (body.success) {
                setLiked(!liked)
            }
        })
    }

    const repostClicked = () => {
        doAPICall('PUT', reposted ? `/unrepost-post/${postId}` : `/repost-post/${postId}`, dispatch, navigate, token, (body) => {
            if (body.success) {
                setReposted(!reposted)
            }
        })
    }

    return (
        <div className="displayedpost">
            <div className="displayedpost--avatars">
                <Link to={`/u/${username}`}>
                    <div className="displayedpost--avatars-author">
                        <img src={avatarUrl ? avatarUrl : `${window.location.origin}/images/user_icon.png`} />
                    </div>
                </Link>
                {parentPostAuthors.length > 0 &&
                    <>
                        <div className="displayedpost--avatars-parent1">
                            <img src={parentPostAuthors[0].avatar ? parentPostAuthors[0].avatar : `${window.location.origin}/images/user_icon.png`} />
                        </div>
                        {parentPostAuthors.length > 1 &&
                            <div className="displayedpost--avatars-parent2">
                                <img src={parentPostAuthors[1].avatar ? parentPostAuthors[1].avatar : `${window.location.origin}/images/user_icon.png`} />
                            </div>
                        }
                    </>
                }
            </div>
            <div className="displayedpost--pane">
                <div className="displayedpost--pane-top">
                    <div className="displayedpost--pane-topleft">
                        <div className="displayedpost--pane-users">
                            {!parentPostUsernamesStr &&
                                <Link to={`/u/${username}`}>{`@${username}`}</Link>
                            }
                            {parentPostUsernamesStr &&
                                <>
                                    <Link to={`/u/${username}`}>
                                        {`@${username}`}
                                    </Link>
                                    {" >> "}
                                    {parentPostAuthors.map((parentPostAuthor, index) => {
                                        <>
                                            <Link to={`/u/${parentPostAuthor.username}`} key={parentPostAuthor.username}>
                                                {`@{${parentPostAuthor.username}}`}
                                            </Link>
                                            {index !== parentPostAuthors.length - 1 &&
                                                <>, </>
                                            }
                                        </>
                                    })}
                                </>
                            }
                        </div>
                        <div className="displayedpost--pane-visibility" title={
                            visibility === "EVERYONE" ? "Visibility: everyone" :
                                (visibility === "MUTUALS" ? "Visibility: mutuals" :
                                    (visibility === "FRIENDS" ? "Visibility: friends" : ""))
                        }>
                            {visibility === "EVERYONE" &&
                                <svg className="displayedpost--pane-visibilityeveryone" xmlns="http://www.w3.org/2000/svg"><path d="M248 8C111.03 8 0 119.03 0 256s111.03 248 248 248 248-111.03 248-248S384.97 8 248 8zm160 215.5v6.93c0 5.87-3.32 11.24-8.57 13.86l-15.39 7.7a15.485 15.485 0 0 1-15.53-.97l-18.21-12.14a15.52 15.52 0 0 0-13.5-1.81l-2.65.88c-9.7 3.23-13.66 14.79-7.99 23.3l13.24 19.86c2.87 4.31 7.71 6.9 12.89 6.9h8.21c8.56 0 15.5 6.94 15.5 15.5v11.34c0 3.35-1.09 6.62-3.1 9.3l-18.74 24.98c-1.42 1.9-2.39 4.1-2.83 6.43l-4.3 22.83c-.62 3.29-2.29 6.29-4.76 8.56a159.608 159.608 0 0 0-25 29.16l-13.03 19.55a27.756 27.756 0 0 1-23.09 12.36c-10.51 0-20.12-5.94-24.82-15.34a78.902 78.902 0 0 1-8.33-35.29V367.5c0-8.56-6.94-15.5-15.5-15.5h-25.88c-14.49 0-28.38-5.76-38.63-16a54.659 54.659 0 0 1-16-38.63v-14.06c0-17.19 8.1-33.38 21.85-43.7l27.58-20.69a54.663 54.663 0 0 1 32.78-10.93h.89c8.48 0 16.85 1.97 24.43 5.77l14.72 7.36c3.68 1.84 7.93 2.14 11.83.84l47.31-15.77c6.33-2.11 10.6-8.03 10.6-14.7 0-8.56-6.94-15.5-15.5-15.5h-10.09c-4.11 0-8.05-1.63-10.96-4.54l-6.92-6.92a15.493 15.493 0 0 0-10.96-4.54H199.5c-8.56 0-15.5-6.94-15.5-15.5v-4.4c0-7.11 4.84-13.31 11.74-15.04l14.45-3.61c3.74-.94 7-3.23 9.14-6.44l8.08-12.11c2.87-4.31 7.71-6.9 12.89-6.9h24.21c8.56 0 15.5-6.94 15.5-15.5v-21.7C359.23 71.63 422.86 131.02 441.93 208H423.5c-8.56 0-15.5 6.94-15.5 15.5z" /></svg>
                            }
                            {visibility === "MUTUALS" &&
                                <svg xmlns="http://www.w3.org/2000/svg"><path d="M 15.602 8.522 L 8.404 8.522 L 8.405 5.764 C 8.405 4.954 7.457 4.54 6.885 5.098 L 0.279 11.536 C -0.093 11.899 -0.093 12.505 0.279 12.868 L 6.885 19.307 L 6.983 19.39 C 7.559 19.818 8.405 19.405 8.405 18.641 L 8.404 15.881 L 15.602 15.881 L 15.603 18.641 C 15.603 19.45 16.552 19.865 17.125 19.307 L 23.722 12.868 C 24.093 12.505 24.093 11.899 23.722 11.538 L 17.125 5.098 C 16.552 4.54 15.603 4.954 15.603 5.764 L 15.602 8.522 Z M 2.203 12.202 L 6.604 7.911 L 6.605 9.443 C 6.605 9.951 7.008 10.363 7.505 10.363 L 16.503 10.363 L 16.625 10.354 C 17.065 10.293 17.403 9.908 17.403 9.443 L 17.402 7.914 L 21.796 12.202 L 17.402 16.49 L 17.403 14.963 C 17.403 14.454 17 14.043 16.503 14.043 L 7.505 14.043 L 7.383 14.052 C 6.944 14.112 6.605 14.497 6.605 14.963 L 6.604 16.492 L 2.203 12.202 Z" fill="#212121" /></svg>
                            }
                            {visibility === "FRIENDS" &&
                                <svg xmlns="http://www.w3.org/2000/svg"><path d="M8,8c0,4.682,3.894,5.148,5.295,4.926s5.062-0.803,5.062-0.803l6.066,5.472l-11.68,8.958L3.606,17h-1.59L2,5h10.5  c0,0-2.06,0.717-2.742,0.968C9.075,6.218,8,6.542,8,8z" /><circle cx="23" cy="19" r="2" /><path d="M15,8.5c0,1.381-1.119,2.5-2.5,2.5S10,9.881,10,8.5V8h3.146L15,8.5z" /><circle cx="19" cy="7" r="2" /><circle cx="20" cy="21" r="2" /><circle cx="17" cy="23" r="2" /><circle cx="14" cy="25" r="2" /><path d="M29,19V7l-4,1l-5.144-2.808l-1.378-0.123L10,8l2.753,2.987L19,9.996c0,0,5.25,4.699,6.167,5.616  c0.88,0.88,1.75,1.543,1.819,3.388H29z" /></svg>
                            }
                        </div>
                    </div>
                    <div className="displayedpost--pane-topright">
                        {showFlag &&
                            <div onClick={flagPost} className="displayedpost--pane-flag" title="Post flagging - report violation of terms of service">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path d="M0 0h24v24H0z" /><path d="M2 3h19.138a.5.5 0 0 1 .435.748L18 10l3.573 6.252a.5.5 0 0 1-.435.748H4v5H2V3z" /></g></svg>
                            </div>
                        }
                        {!expanded &&
                            <Link to={`/p/${postId}`}>
                                <div className="displayedpost--pane-expand" title="Expand post">
                                    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M28,2h-6c-1.104,0-2,0.896-2,2s0.896,2,2,2h1.2l-4.6,4.601C18.28,10.921,18,11.344,18,12c0,1.094,0.859,2,2,2  c0.641,0,1.049-0.248,1.4-0.6L26,8.8V10c0,1.104,0.896,2,2,2s2-0.896,2-2V4C30,2.896,29.104,2,28,2z M12,18  c-0.641,0-1.049,0.248-1.4,0.6L6,23.2V22c0-1.104-0.896-2-2-2s-2,0.896-2,2v6c0,1.104,0.896,2,2,2h6c1.104,0,2-0.896,2-2  s-0.896-2-2-2H8.8l4.6-4.601C13.72,21.079,14,20.656,14,20C14,18.906,13.141,18,12,18z" /></svg>
                                </div>
                            </Link>
                        }
                        {/* TODO: Stash */}
                    </div>
                </div>
                <hr />
                <div className="displayedpost--pane-body">
                    {processedPostPreview && <MarkdownRenderer markdownText={processedPostPreview} />}
                    {postMediaUrl &&
                        <div className="displayedpost--pane-media">
                            <a href={postMediaUrl}>
                                <img src={postMediaUrl} />
                            </a>
                        </div>
                    }
                </div>
                <hr />
                <div className="displayedpost--pane-bottom">
                    <div className="displayedpost--pane-bottomelems">
                        <div className="displayedpost--pane-bottomelem">
                            <Link to={`/p/${postId}`}>
                                <div className="displayedpost--bottom-repliesgraphic" title="View replies">
                                    <svg xmlns="http://www.w3.org/2000/svg"><g id="grid_system" /><g id="_icons"><path d="M22,13.5c0-2.3-1.8-4.2-4-4.5c-0.2-2.8-2.6-5-5.4-5H7.5C6,4,4.6,4.6,3.6,5.6C2.6,6.6,2,8,2,9.5c0,1.2,0.4,2.3,1,3.2l-1,3   c-0.1,0.4,0,0.8,0.3,1.1C2.5,16.9,2.8,17,3,17c0.2,0,0.3,0,0.4-0.1l4-2c0,0,0,0,0,0h1.8c0.2,0.5,0.4,1,0.7,1.4   c0.9,1.1,2.1,1.7,3.5,1.7h2.3l3.8,1.9C19.7,20,19.8,20,20,20c0.2,0,0.5-0.1,0.7-0.2c0.3-0.3,0.4-0.7,0.3-1.1L20.4,17   c0.1-0.1,0.2-0.2,0.3-0.3C21.5,15.8,22,14.7,22,13.5z M7.3,12.9c-0.2,0-0.4,0-0.6,0.1l-2.1,1l0.4-1.3c0.1-0.3,0-0.7-0.2-1   C4.3,11.1,4,10.3,4,9.5C4,8.5,4.4,7.7,5,7c0.7-0.7,1.5-1,2.4-1h5.1c1.8,0,3.2,1.3,3.4,3h-2.5c-1.2,0-2.3,0.5-3.2,1.3   c-0.7,0.7-1.1,1.5-1.3,2.4c0,0.1,0,0.1,0,0.2H7.5C7.4,12.9,7.4,12.9,7.3,12.9z M19.3,15.3c-0.2,0.2-0.4,0.3-0.6,0.4   c-0.4,0.2-0.6,0.7-0.5,1.2l0.1,0.2l-1.8-0.9C16.3,16,16.2,16,16,16h-2.5c-0.8,0-1.5-0.3-2-1c-0.3-0.4-0.5-0.8-0.5-1.2   c0-0.1,0-0.2,0-0.3c0-0.1,0-0.3,0-0.4c0.1-0.5,0.3-1,0.7-1.3c0.5-0.5,1.1-0.7,1.8-0.7H17h0.5c1.4,0,2.5,1.1,2.5,2.5   C20,14.2,19.7,14.8,19.3,15.3z" /></g></svg>
                                </div>
                            </Link>
                            {numReplies}
                        </div>
                        <div className="displayedpost--pane-bottomelem">
                            <div className="displayedpost--bottom-likesgraphic" title={viewingUserGoogleId ? (liked ? "Undo like" : "Like post") : "Likes"} onClick={viewingUserGoogleId ? likeClicked : () => { }}>
                                {liked &&
                                    <svg xmlns="http://www.w3.org/2000/svg"><path d="M 462.1 62.86 C 438.8 41.92 408.9 31.1 378.7 32 C 341.21 32 303.37 47.4 275.7 75.98 L 256 96.25 L 236.3 75.98 C 208.6 47.4 170.8 32 133.3 32 C 103.1 32 73.23 41.93 49.04 62.86 C -13.1 116.65 -16.21 212.56 39.81 270.46 L 233.01 470.16 C 239.4 476.7 247.6 480 255.9 480 C 264.232 480 272.59 476.733 278.91 470.196 L 472.01 270.496 C 528.2 212.5 525.1 116.6 462.1 62.86 Z" /></svg>
                                }
                                {!liked &&
                                    <svg xmlns="http://www.w3.org/2000/svg"><path d="M462.1 62.86C438.8 41.92 408.9 31.1 378.7 32c-37.49 0-75.33 15.4-103 43.98l-19.7 20.27l-19.7-20.27C208.6 47.4 170.8 32 133.3 32C103.1 32 73.23 41.93 49.04 62.86c-62.14 53.79-65.25 149.7-9.23 207.6l193.2 199.7C239.4 476.7 247.6 480 255.9 480c8.332 0 16.69-3.267 23.01-9.804l193.1-199.7C528.2 212.5 525.1 116.6 462.1 62.86zM437.6 237.1l-181.6 187.8L74.34 237.1C42.1 203.8 34.46 138.1 80.46 99.15c39.9-34.54 94.59-17.5 121.4 10.17l54.17 55.92l54.16-55.92c26.42-27.27 81.26-44.89 121.4-10.17C477.1 138.6 470.5 203.1 437.6 237.1z" /></svg>
                                }
                            </div>
                            {numLikes}
                        </div>
                        <div className="displayedpost--pane-bottomelem">
                            <div className="displayedpost--bottom-repostsgraphic" title={viewingUserGoogleId ? (reposted ? "Undo repost" : "Repost") : "Reposts"} onClick={viewingUserGoogleId ? repostClicked : () => { }}>
                                {reposted &&
                                    <svg xmlns="http://www.w3.org/2000/svg"><path d="M 625.536 348.186 C 621.541 338.471 612.042 331.238 601.571 331.238 L 549.754 331.238 L 549.754 176.761 C 549.754 129.155 511 90.4 463.394 90.4 L 325.217 90.4 C 306.143 90.4 290.673 105.848 290.673 124.945 C 290.673 144.041 306.143 159.489 325.217 159.489 L 463.394 159.489 C 472.894 159.489 480.666 167.261 480.666 176.761 L 480.666 331.238 L 428.85 331.238 C 418.375 331.238 408.933 337.546 404.917 347.236 C 400.902 356.926 403.13 368.06 410.534 375.476 L 496.894 461.858 C 501.932 467.903 508.625 470.386 515.21 470.386 C 521.795 470.386 528.467 467.856 533.529 462.796 L 619.89 376.414 C 627.263 369.021 629.53 357.902 625.536 348.186 Z M 311.911 366.754 L 173.735 366.754 C 164.235 366.754 156.463 358.981 156.463 349.481 L 156.463 194.033 L 208.279 194.033 C 218.753 194.033 228.196 187.724 232.212 178.035 C 236.227 168.345 233.999 157.211 226.595 149.795 L 140.234 63.413 C 135.196 58.382 128.504 55.856 121.919 55.856 C 115.334 55.856 108.641 58.382 103.567 63.445 L 17.207 149.827 C 9.834 157.222 7.61 168.341 11.626 178.056 C 15.641 187.772 25.087 194.033 35.558 194.033 L 87.374 194.033 L 87.374 349.481 C 87.374 397.088 126.129 435.842 173.735 435.842 L 311.911 435.842 C 330.986 435.842 346.455 420.394 346.455 401.298 C 346.455 382.201 331.019 366.754 311.911 366.754 Z" /></svg>
                                }
                                {!reposted &&
                                    <svg xmlns="http://www.w3.org/2000/svg"><path d="M614.2 334.8C610.5 325.8 601.7 319.1 592 319.1H544V176C544 131.9 508.1 96 464 96h-128c-17.67 0-32 14.31-32 32s14.33 32 32 32h128C472.8 160 480 167.2 480 176v143.1h-48c-9.703 0-18.45 5.844-22.17 14.82s-1.656 19.29 5.203 26.16l80 80.02C499.7 445.7 505.9 448 512 448s12.28-2.344 16.97-7.031l80-80.02C615.8 354.1 617.9 343.8 614.2 334.8zM304 352h-128C167.2 352 160 344.8 160 336V192h48c9.703 0 18.45-5.844 22.17-14.82s1.656-19.29-5.203-26.16l-80-80.02C140.3 66.34 134.1 64 128 64S115.7 66.34 111 71.03l-80 80.02C24.17 157.9 22.11 168.2 25.83 177.2S38.3 192 48 192H96V336C96 380.1 131.9 416 176 416h128c17.67 0 32-14.31 32-32S321.7 352 304 352z" /></svg>
                                }
                            </div>
                            {numReposts}
                        </div>
                        <div className="displayedpost--pane-bottomelem">
                            <div>
                                {timeAgo.format(createTime, 'twitter')}
                            </div>
                        </div>
                    </div>
                    {hasExtension &&
                        <div className="displayedpost--pane-expandinfo">Expand for full post...</div>
                    }
                </div>
            </div>
        </div >
    )
}