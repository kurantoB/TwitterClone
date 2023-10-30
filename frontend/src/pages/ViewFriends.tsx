import { useEffect, useState } from "react"
import doAPICall from "../app/apiLayer"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { Link, useNavigate } from "react-router-dom"
import { HeaderMode, setHeaderMode } from "../app/appState"

export default function ViewFriends() {
    const [friendUsernames, setFriendUsernames] = useState<string[]>([])

    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const token = useAppSelector((state) => state.tokenId)

    useEffect(() => {
        doAPICall('GET', '/get-friendlist', dispatch, navigate, token, (body) => {
            if (body.friendUsernames) {
                setFriendUsernames(body.friendUsernames)
                dispatch(setHeaderMode(HeaderMode.CAN_EDIT_PROFILE))
            }
        })
    }, [])

    return (
        <div className="view-profile">
            <h1>Your friends</h1>
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