import { useNavigate, useParams, json } from "react-router-dom"
import doAPICall from "../app/apiLayer"
import { useDispatch } from "react-redux"
import { useAppSelector } from "../app/hooks"
import DisplayCard from "../components/DisplayCard"
import { useEffect, useState } from 'react'
import consts from "../consts"
import { format } from "date-fns"
import MarkdownRenderer from "../components/MarkdownRenderer"

type User = {
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
    const [tabContentStyles, setTabContentStyles] = useState<React.CSSProperties[]>([
        { display: "none" },
        { display: "none" },
        { display: "none" },
        { display: "none" }
    ])

    useEffect(() => {
        doAPICall('GET', `/get-profile/${username}`, dispatch, navigate, token, (body) => {
            setUser(body.user)
            setViewingOwn(body.viewingOwn)
            if (userExists && !body.viewingOwn) {
                doAPICall('GET', `/get-following-relationship/${body.user.id}`, dispatch, navigate, token, (body) => {
                    setFollowing(body.following)
                    setFollowedBy(body.followedBy)
                })
            }
        }, null, (error, body) => {
            navigate("/error")
        })
    }, [userExists, username])

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
    }, [username])

    return (
        <div className="view-profile">
            <div>
                <DisplayCard
                    avatarImage={user ? `${consts.CLOUD_STORAGE_ROOT}/${consts.CLOUD_STORAGE_AVATAR_BUCKETNAME}/${user.avatar}` : `${window.location.origin}/images/user_icon.png`}
                    username={user ? user.username : ""}
                    shortBio={user ? user.shortBio : ""}
                />
            </div>
            <div>
                {!viewingOwn && following && followedBy && <h3 className="view-profile--sticker">Mutuals&nbsp;<svg fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></h3>}
                {!viewingOwn && !following && followedBy && <h3 className="view-profile--sticker">Follows you&nbsp;<svg fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></h3>}
            </div>
            <div>
                {!viewingOwn && !following && <button className="largeButton">Follow</button>}
                {!viewingOwn && following && <button className="largeButton">Unfollow</button>}
            </div>
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
            <hr />
            <div>
                <MarkdownRenderer markdownText={user ? user.bio : ""} />
            </div>
            <hr />
            {!viewingOwn && userExists &&
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
                        <button className="linkButton view-profile--tabbutton" onClick={() => { openTab(0) }} id="view-profile--defaultopen">Activity</button>
                        <button className="linkButton view-profile--tabbutton" onClick={() => { openTab(1) }}>{viewingOwn ? "Mutuals" : "More Mutuals"}</button>
                        <button className="linkButton view-profile--tabbutton" onClick={() => { openTab(2) }}>Followers</button>
                        <button className="linkButton view-profile--tabbutton" onClick={() => { openTab(3) }}>Following</button>
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
        </div>
    )
}