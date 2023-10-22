import { useNavigate, useParams } from "react-router-dom"
import doAPICall from "../app/apiLayer"
import { useDispatch } from "react-redux"
import { useAppSelector } from "../app/hooks"
import DisplayCard from "../components/DisplayCard"
import { useEffect, useState } from 'react'
import consts from "../consts"
import { format } from "date-fns"
import MarkdownRenderer from "../components/MarkdownRenderer"
import { HeaderMode, addErrorMessage, setHeaderMode } from "../app/appState"

export type User = {
    id: string
    username: string
    avatar: string
    bio: string
    shortBio: string
    followerCount: number
    followingCount: number
    mutualCount: number
    createTime: Date
}

export default function ViewProfile() {
    const { username } = useParams()

    const dispatch = useDispatch()
    const token = useAppSelector((state) => state.tokenId)
    const userExists = useAppSelector((state) => state.userExists)
    const navigate = useNavigate()
    const [user, setUser] = useState<User | null>(null)
    const [viewingOwn, setViewingOwn] = useState<boolean>(false)
    const [following, setFollowing] = useState<boolean>(false)
    const [followedBy, setFollowedBy] = useState<boolean>(false)
    const [isBlocking, setIsBlocking] = useState<boolean>(false)
    const [isBlockedBy, setIsBlockedBy] = useState<boolean>(false)
    const [tabContentStyles, setTabContentStyles] = useState<React.CSSProperties[]>([
        { display: "none" },
        { display: "none" },
        { display: "none" },
        { display: "none" }
    ])

    const accessProfile = (user: User, viewingOwn: boolean) => {
        if (userExists) {
            if (viewingOwn) {
                dispatch(setHeaderMode(HeaderMode.CAN_EDIT_PROFILE))
            } else {
                doAPICall('GET', `/get-following-relationship/${user!.id}`, dispatch, navigate, token, (body) => {
                    setFollowing(body.following)
                    setFollowedBy(body.followedBy)
                }, null, undefined, "userExists, username", [userExists, username])
                doAPICall('GET', `/is-blocked/${user!.id}`, dispatch, navigate, token, (body) => {
                    setIsBlocking(body.isBlocking)
                }, null, undefined, "userExists, username", [userExists, username])
            }
        }
    }

    useEffect(() => {
        setFollowing(false)
        setFollowedBy(false)
        setIsBlocking(false)
        setIsBlockedBy(false)
        doAPICall('GET', `/get-profile/${username}`, dispatch, navigate, token, (profileBody) => {
            dispatch(setHeaderMode(HeaderMode.NONE))
            setUser(profileBody.user)
            setViewingOwn(profileBody.viewingOwn)
            if (!profileBody.user) {
                navigate("/error")
                return
            }
            if (profileBody.viewingOwn || !userExists) {
                accessProfile(profileBody.user, profileBody.viewingOwn)
            } else {
                doAPICall('GET', `/is-blocked-by/${profileBody.user.id}`, dispatch, navigate, token, (blockedByBody) => {
                    if (blockedByBody.isBlockedBy) {
                        setIsBlockedBy(true)
                        doAPICall('GET', `/is-blocked/${profileBody.user!.id}`, dispatch, navigate, token, (isBlockedBody) => {
                            setIsBlocking(isBlockedBody.isBlocking)
                        }, null, undefined, "userExists, username", [userExists, username])
                    } else {
                        accessProfile(profileBody.user, profileBody.viewingOwn)
                    }
                }, null, undefined, "userExists, username", [userExists, username])
            }
        }, null, (error, body) => {
            navigate("/error")
        }, "userExists, username", [userExists, username])
    }, [userExists, username])

    const handleFollow = (action: boolean) => {
        if (!user) {
            return
        }
        doAPICall('PATCH', `/${action ? "follow" : "unfollow"}/${user.id}`, dispatch, navigate, token, (body) => {
            setFollowing(action)
            setUser({
                ...user,
                followerCount: action ? user.followerCount + 1 : user.followerCount - 1,
                mutualCount: action ? (followedBy ? user.mutualCount + 1 : user.mutualCount) : (followedBy ? user.mutualCount - 1 : user.mutualCount)
            })
        })
    }

    const openTab = (elemNum: number) => {
        const currentTabContentStyles: React.CSSProperties[] = [
            { display: "none" },
            { display: "none" },
            { display: "none" },
            { display: "none" }
        ]
        currentTabContentStyles[elemNum] = {
            display: "flex"
        }
        setTabContentStyles(currentTabContentStyles)

        const tablinks = document.getElementsByClassName("view-profile--tabbutton")
        for (let i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "")
            if (i === elemNum) {
                tablinks[i].className += " active"
            }
        }
    }

    useEffect(() => {
        document.getElementById("view-profile--defaultopen")?.click()
    }, [])

    const handleBlock = (action: boolean) => {
        if (!user) {
            return
        }
        doAPICall('PATCH', `/${action ? "block" : "unblock"}/${user.id}`, dispatch, navigate, token, (_) => {
            setIsBlocking(action)
            if (!isBlockedBy && action) {
                setUser({
                    ...user,
                    followerCount: following ? user.followerCount - 1 : user.followerCount,
                    followingCount: followedBy ? user.followingCount - 1 : user.followingCount,
                    mutualCount: following && followedBy ? user.mutualCount - 1 : user.mutualCount
                })
                setFollowing(false)
                setFollowedBy(false)
            }
        })
    }

    const handleDM = () => {
        console.log("Navigate to DMs")
        // navigate to DMs
        dispatch(addErrorMessage("DMs page isn't ready yet."))
    }

    if (isBlockedBy) {
        return (
            <div className="view-profile">
                <h1>{user?.username}</h1>
                <p>This user has you blocked. You are disallowed from viewing their profile, following them, DMing them, or interacting with their posts.</p>
                <div>
                    {isBlocking &&
                        <div className="interactive--elem" title="Unblock handle" onClick={() => handleBlock(false)}>
                            <div className="interactive--active-area">
                                <svg className="block" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg"><path d="M48,0A48,48,0,1,0,96,48,48.0512,48.0512,0,0,0,48,0Zm0,12a35.71,35.71,0,0,1,20.7993,6.7214L18.717,68.7935A35.8886,35.8886,0,0,1,48,12Zm0,72a35.71,35.71,0,0,1-20.7993-6.7214L77.283,27.2065A35.8886,35.8886,0,0,1,48,84Z" /></svg>
                            </div>
                        </div>
                    }
                    {!isBlocking &&
                        <div className="interactive--elem" title="Block back" onClick={() => handleBlock(true)}>
                            <div className="interactive--active-area">
                                <svg enable-background="new 0 0 32 32" height="32px" id="Capa_1" version="1.1" viewBox="0 0 32 32" width="32px" xmlSpace="preserve" xmlns="http://www.w3.org/2000/svg"><path d="M16,4c6.63,0,12,5.37,12,12s-5.37,12-12,12S4,22.63,4,16S9.37,4,16,4 M8.25,22.33L22.33,8.26C20.61,6.85,18.4,6,16,6  C10.49,6,6,10.49,6,16C6,18.4,6.85,20.61,8.25,22.33 M16,26c5.51,0,10-4.49,10-10c0-2.4-0.85-4.61-2.26-6.33L9.67,23.75  C11.39,25.15,13.6,26,16,26 M16,2C8.28,2,2,8.28,2,16s6.28,14,14,14s14-6.28,14-14S23.72,2,16,2L16,2z M8.632,19.12  C8.219,18.139,8,17.076,8,16c0-4.411,3.589-8,8-8c1.079,0,2.143,0.22,3.124,0.636L8.632,19.12L8.632,19.12z M12.88,23.368  l10.484-10.492C23.78,13.857,24,14.921,24,16c0,4.411-3.589,8-8,8C14.924,24,13.861,23.781,12.88,23.368L12.88,23.368z" /><g /><g /><g /><g /><g /><g /></svg>
                            </div>
                        </div>
                    }
                </div>
            </div>
        )
    }

    return (
        <div className="view-profile">
            <div>
                <DisplayCard
                    avatarImage={(user && user.avatar) ? `${consts.CLOUD_STORAGE_ROOT}/${consts.CLOUD_STORAGE_AVATAR_BUCKETNAME}/${user.avatar}` : `${window.location.origin}/images/user_icon.png`}
                    username={user ? user.username : ""}
                    shortBio={user ? user.shortBio : ""}
                />
            </div>
            {userExists && !viewingOwn && !isBlocking &&
                <>
                    <div>
                        {following && followedBy && <h3 className="view-profile--sticker">Mutuals&nbsp;<svg fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></h3>}
                        {!following && followedBy && <h3 className="view-profile--sticker">Follows you&nbsp;<svg fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></h3>}
                    </div>
                    <div>
                        {!following && <button className="largeButton" onClick={() => handleFollow(true)}>{followedBy ? "Follow Back" : "Follow"}</button>}
                        {!viewingOwn && following && <button className="largeButton" onClick={() => handleFollow(false)}>Unfollow</button>}
                    </div>
                </>

            }
            <div>
                <div className="view-profile--stats">
                    <span>Followers: {user?.followerCount}</span>
                    <span>|</span>
                    <span>Following: {user?.followingCount}</span>
                    <span>|</span>
                    <span>Mutuals: {user?.mutualCount}</span>
                </div>
                {user && <p>Joined {format(new Date(user.createTime), 'MMM yyyy')}</p>}
            </div>
            {
                !viewingOwn && userExists &&
                <div>
                    <div className="view-profile--interactive">
                        <div className="interactive--elem" title="DM user" onClick={handleDM}>
                            <div className="interactive--active-area">
                                <svg version="1.1" viewBox="0 0 24 24"><g className="st0" id="grid_system" /><g id="_icons"><path d="M18,5H6C5.1,5,4.1,5.3,3.4,5.9c0,0,0,0,0,0c0,0,0,0,0,0c0,0,0,0,0,0C2.5,6.7,2,7.8,2,9v6c0,2.2,1.8,4,4,4h12   c2.2,0,4-1.8,4-4V9c0-1.2-0.5-2.3-1.4-3.1C19.9,5.3,18.9,5,18,5z M18,7L13,10.9c-0.6,0.5-1.5,0.5-2.1,0L6,7H18z M20,15   c0,1.1-0.9,2-2,2H6c-1.1,0-2-0.9-2-2V9c0-0.3,0.1-0.6,0.2-0.9l5.5,4.4c0.7,0.5,1.5,0.8,2.3,0.8s1.6-0.3,2.3-0.8l5.5-4.4   C19.9,8.4,20,8.7,20,9V15z" /></g></svg>
                            </div>
                        </div>
                        {isBlocking &&
                            <div className="interactive--elem" title="Unblock handle" onClick={() => handleBlock(false)}>
                                <div className="interactive--active-area">
                                    <svg className="block" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg"><path d="M48,0A48,48,0,1,0,96,48,48.0512,48.0512,0,0,0,48,0Zm0,12a35.71,35.71,0,0,1,20.7993,6.7214L18.717,68.7935A35.8886,35.8886,0,0,1,48,12Zm0,72a35.71,35.71,0,0,1-20.7993-6.7214L77.283,27.2065A35.8886,35.8886,0,0,1,48,84Z" /></svg>
                                </div>
                            </div>
                        }
                        {!isBlocking &&
                            <div className="interactive--elem" title="Block handle" onClick={() => handleBlock(true)}>
                                <div className="interactive--active-area">
                                    <svg enable-background="new 0 0 32 32" height="32px" id="Capa_1" version="1.1" viewBox="0 0 32 32" width="32px" xmlSpace="preserve" xmlns="http://www.w3.org/2000/svg"><path d="M16,4c6.63,0,12,5.37,12,12s-5.37,12-12,12S4,22.63,4,16S9.37,4,16,4 M8.25,22.33L22.33,8.26C20.61,6.85,18.4,6,16,6  C10.49,6,6,10.49,6,16C6,18.4,6.85,20.61,8.25,22.33 M16,26c5.51,0,10-4.49,10-10c0-2.4-0.85-4.61-2.26-6.33L9.67,23.75  C11.39,25.15,13.6,26,16,26 M16,2C8.28,2,2,8.28,2,16s6.28,14,14,14s14-6.28,14-14S23.72,2,16,2L16,2z M8.632,19.12  C8.219,18.139,8,17.076,8,16c0-4.411,3.589-8,8-8c1.079,0,2.143,0.22,3.124,0.636L8.632,19.12L8.632,19.12z M12.88,23.368  l10.484-10.492C23.78,13.857,24,14.921,24,16c0,4.411-3.589,8-8,8C14.924,24,13.861,23.781,12.88,23.368L12.88,23.368z" /><g /><g /><g /><g /><g /><g /></svg>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            }
            <hr />
            <div>
                <MarkdownRenderer markdownText={user ? user.bio : ""} />
            </div>
            <hr />
            {
                !viewingOwn && userExists &&
                <>
                    <div>
                        <h2>Shared Mutuals</h2>
                        <div />
                    </div>
                    <hr />
                </>
            }
            <div>
                {/* Tab links */}
                <div className="view-profile--tab">
                    <div>
                        <button
                            className="linkButton view-profile--tabbutton"
                            onClick={() => { openTab(0) }}
                            id="view-profile--defaultopen"
                            title="Activity feed"
                        >Activity</button>
                        {userExists && !viewingOwn &&
                            <button
                                className="linkButton view-profile--tabbutton"
                                onClick={() => { openTab(1) }}
                                title="Mutuals not shared with this user"
                            >More Mutuals</button>
                        }
                        {(!userExists || viewingOwn) &&
                            <button
                                className="linkButton view-profile--tabbutton"
                                onClick={() => { openTab(1) }}
                                title="All mutuals"
                            >Mutuals</button>
                        }
                        <button
                            className="linkButton view-profile--tabbutton"
                            onClick={() => { openTab(2) }}
                            title="Followers apart from mutuals"
                        >Followers</button>
                        <button
                            className="linkButton view-profile--tabbutton"
                            onClick={() => { openTab(3) }}
                            title="Followed handles apart from mutuals"
                        >Following</button>
                    </div>
                </div>
                {/* Tab content */}
                <div
                    style={tabContentStyles[0]}
                />
                <div
                    style={tabContentStyles[1]}
                    className="view-profile--lists"
                >
                    {!viewingOwn && userExists &&
                        <>
                            <h3>Follows you</h3>
                            <div />
                            <hr />
                            <h3>You follow</h3>
                            <div />
                            <hr />
                            <h3>More handles</h3>
                            <div />
                        </>
                    }
                    {(viewingOwn || !userExists) &&
                        <div />
                    }
                </div>
                <div
                    style={tabContentStyles[2]}
                    className="view-profile--lists"
                >
                    {!viewingOwn && userExists &&
                        <>
                            <h3>Also follows you</h3>
                            <div />
                            <hr />
                            <h3>More followers</h3>
                            <div />
                        </>
                    }
                    {(viewingOwn || !userExists) &&
                        <div />
                    }
                </div>
                <div
                    style={tabContentStyles[3]}
                    className="view-profile--lists"
                >
                    {!viewingOwn && userExists &&
                        <>
                            <h3>You also follow</h3>
                            <div />
                            <hr />
                            <h3>More handles</h3>
                            <div />
                        </>
                    }
                    {(viewingOwn || !userExists) &&
                        <div />
                    }
                </div>
            </div>
        </div >
    )
}