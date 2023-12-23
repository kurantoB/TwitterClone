import { useEffect, useState } from "react"
import doAPICall from "../app/apiLayer"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { Link, useNavigate } from "react-router-dom"
import { HeaderMode, setHeaderMode } from "../app/appState"

export default function ViewBlockedHandles() {
    const accessToken = useAppSelector((state) => state.tokenId)
    const userExists = useAppSelector((state) => state.userExists)
    const navigate = useNavigate()

    const [blockedUsernames, setBlockedUsernames] = useState<string[]>([])

    const dispatch = useAppDispatch()

    useEffect(() => {
        if (userExists === null) {
            // still trying to do persistent login
            return
        }
        if (!accessToken || !userExists) {
            navigate("/error")
            return
        }

        dispatch(setHeaderMode(HeaderMode.CAN_EDIT_PROFILE))

        doAPICall('GET', '/get-blocklist', dispatch, navigate, accessToken, (body) => {
            if (body.blockedUsernames) {
                setBlockedUsernames(body.blockedUsernames)
            }
        })
    }, [userExists])

    return (
        <div className="view-profile">
            <h1>Blocked handles</h1>
            <div>
                {blockedUsernames.length === 0 && <p>&lt;Empty&gt;</p>}
                {blockedUsernames.map((blockedUsername) =>
                    <div key={blockedUsername} className="blocked-handles--listitem">
                        <Link to={`/u/${blockedUsername}`}>{blockedUsername}</Link>
                    </div>
                )}
            </div>
        </div >
    )
}