import { useEffect, useState } from "react"
import doAPICall from "../app/apiLayer"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { Link, useNavigate } from "react-router-dom"
import { HeaderMode, setHeaderMode } from "../app/appState"

export default function ViewFriends() {
    const accessToken = useAppSelector((state) => state.tokenId)
    const userExists = useAppSelector((state) => state.userExists)
    const navigate = useNavigate()

    const [friendUsernames, setFriendUsernames] = useState<string[]>([])

    const dispatch = useAppDispatch()
    const token = useAppSelector((state) => state.tokenId)

    useEffect(() => {
        if (!accessToken || !userExists) {
            navigate("/error")
            return
        }

        doAPICall('GET', '/get-friendlist', dispatch, navigate, token, (body) => {
            if (body.friendUsernames) {
                setFriendUsernames(body.friendUsernames)
                dispatch(setHeaderMode(HeaderMode.CAN_EDIT_PROFILE))
            }
        })
    }, [])

    return (
        <div className="view-profile">
            <h1><span>Your friends&nbsp;</span><svg className="view-profile--friendsgraphic" xmlns="http://www.w3.org/2000/svg"><path d="M8,8c0,4.682,3.894,5.148,5.295,4.926s5.062-0.803,5.062-0.803l6.066,5.472l-11.68,8.958L3.606,17h-1.59L2,5h10.5  c0,0-2.06,0.717-2.742,0.968C9.075,6.218,8,6.542,8,8z"/><circle cx="23" cy="19" r="2"/><path d="M15,8.5c0,1.381-1.119,2.5-2.5,2.5S10,9.881,10,8.5V8h3.146L15,8.5z"/><circle cx="19" cy="7" r="2"/><circle cx="20" cy="21" r="2"/><circle cx="17" cy="23" r="2"/><circle cx="14" cy="25" r="2"/><path d="M29,19V7l-4,1l-5.144-2.808l-1.378-0.123L10,8l2.753,2.987L19,9.996c0,0,5.25,4.699,6.167,5.616  c0.88,0.88,1.75,1.543,1.819,3.388H29z"/></svg></h1>
            <div>
                {friendUsernames.length === 0 && <p>&lt;Empty&gt;</p>}
                {friendUsernames.map((friendUsername) =>
                    <div key={friendUsername} className="blocked-handles--listitem">
                        <Link to={`/u/${friendUsername}`}>{friendUsername}</Link>
                    </div>
                )}
            </div>
        </div >
    )
}