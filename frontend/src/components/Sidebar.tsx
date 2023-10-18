import { useDispatch } from "react-redux"
import doAPICall from "../app/apiLayer"
import { useAppSelector } from "../app/hooks"
import consts from "../consts"
import { useState, useEffect } from 'react'
import { addErrorMessage, findUser } from "../app/appState"
import { useNavigate } from "react-router-dom"

export default function Sidebar() {
    const dispatch = useDispatch()
    const accessToken = useAppSelector((state) => state.tokenId)
    const userExists = useAppSelector((state) => state.userExists)
    const [avatarUrl, setAvatarUrl] = useState<string>(`${window.location.origin}/images/user_icon.png`)
    const navigate = useNavigate()

    useEffect(() => {
        if (!accessToken || !userExists) {
            return
        }
        doAPICall('GET', '/has-avatar', dispatch, navigate, accessToken, (body) => {
            if (body.hasAvatar) {
                doAPICall('GET', '/get-userid', dispatch, navigate, accessToken, (body) => {
                    const filePath = `${body.userId}_avatar`
                    const fileURL = `${consts.CLOUD_STORAGE_ROOT}/${consts.CLOUD_STORAGE_AVATAR_BUCKETNAME}/${filePath}`
                    setAvatarUrl(fileURL)
                })
            } else {
                setAvatarUrl(`${window.location.origin}/images/user_icon.png`)
            }
        })
    }, [userExists])

    if (!accessToken || !userExists) {
        return <div></div>
    }

    const navigateToProfile = () => {
        doAPICall('GET', '/get-username', dispatch, navigate, accessToken, (body) => {
            navigate(`/u/${body.username}`)
        })
    }

    const navigateToNotifications = () => {
        console.log("Navigate to Notifications")
        // navigate to Notifications
        dispatch(addErrorMessage("Notifications page isn't ready yet."))
    }

    const navigateToDMs = () => {
        console.log("Navigate to DMs")
        // navigate to DMs
        dispatch(addErrorMessage("DMs page isn't ready yet."))
    }

    return (
        <div className="sidebar">
            <div className="interactive--elem" onClick={navigateToProfile} title="View profile">
                <div className="interactive--active-area">
                    <img src={avatarUrl} />
                </div>
            </div>
            <div className="interactive--elem" onClick={navigateToNotifications} title="View notifications">
                <div className="interactive--active-area">
                    <svg data-name="Layer 1" id="Layer_1" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M40.62,28.34l-.87-.7A2,2,0,0,1,39,26.08V18A15,15,0,0,0,26.91,3.29a3,3,0,0,0-5.81,0A15,15,0,0,0,9,18v8.08a2,2,0,0,1-.75,1.56l-.87.7a9,9,0,0,0-3.38,7V37a4,4,0,0,0,4,4h8.26a8,8,0,0,0,15.47,0H40a4,4,0,0,0,4-4V35.36A9,9,0,0,0,40.62,28.34ZM24,43a4,4,0,0,1-3.44-2h6.89A4,4,0,0,1,24,43Zm16-6H8V35.36a5,5,0,0,1,1.88-3.9l.87-.7A6,6,0,0,0,13,26.08V18a11,11,0,0,1,22,0v8.08a6,6,0,0,0,2.25,4.69l.87.7A5,5,0,0,1,40,35.36Z" /></svg>
                </div>
            </div>
            <div className="interactive--elem" onClick={navigateToDMs} title="View DMs">
                <div className="interactive--active-area">
                    <svg version="1.1" viewBox="0 0 24 24"><g className="st0" id="grid_system" /><g id="_icons"><path d="M18,5H6C5.1,5,4.1,5.3,3.4,5.9c0,0,0,0,0,0c0,0,0,0,0,0c0,0,0,0,0,0C2.5,6.7,2,7.8,2,9v6c0,2.2,1.8,4,4,4h12   c2.2,0,4-1.8,4-4V9c0-1.2-0.5-2.3-1.4-3.1C19.9,5.3,18.9,5,18,5z M18,7L13,10.9c-0.6,0.5-1.5,0.5-2.1,0L6,7H18z M20,15   c0,1.1-0.9,2-2,2H6c-1.1,0-2-0.9-2-2V9c0-0.3,0.1-0.6,0.2-0.9l5.5,4.4c0.7,0.5,1.5,0.8,2.3,0.8s1.6-0.3,2.3-0.8l5.5-4.4   C19.9,8.4,20,8.7,20,9V15z" /></g></svg>
                </div>
            </div>
        </div>
    )
}