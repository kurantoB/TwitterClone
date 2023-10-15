import { useNavigate, useParams } from "react-router-dom"
import doAPICall from "../app/apiLayer"
import { useDispatch } from "react-redux"
import { useAppSelector } from "../app/hooks"
import { addErrorMessage } from "../app/appState"
import DisplayCard from "../components/DisplayCard"
import { useEffect, useState } from 'react'
import consts from "../consts"

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
            // Navigate to not found
            console.log("Not found")
            dispatch(addErrorMessage(`get-profile not found, returned ${JSON.stringify(body)}`))
        })
    }, [userExists])

    return (
        <div className="view-profile">
            <DisplayCard
                avatarImage={user ? `${consts.CLOUD_STORAGE_ROOT}/${consts.CLOUD_STORAGE_AVATAR_BUCKETNAME}/${user.avatar}` : `${window.location.origin}/images/user_icon.png`}
                username={user ? user.username : ""}
                shortBio={user ? user.shortBio : ""}
            />
            {!viewingOwn && following && followedBy && <h3 className="view-profile--sticker">Mutuals&nbsp;<svg fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></h3>}
            {!viewingOwn && !following && followedBy && <h3 className="view-profile--sticker">Follows you&nbsp;<svg fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></h3>}
            {!viewingOwn && !following && <button className="largeButton">Follow</button>}
            {!viewingOwn && following && <button className="largeButton">Unfollow</button>}
            <div className="view-profile--stats">
                <span>Followers: {user?.followerCount}</span>
                <span>Following: {user?.followingCount}</span>
                <span>Mutuals: {user?.mutualCount}</span>
            </div>
        </div>
    )
}