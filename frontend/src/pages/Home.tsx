import { useDispatch } from "react-redux"
import { HeaderMode, addErrorMessage, setHeaderMode } from "../app/appState"
import { useAppSelector } from "../app/hooks"
import { ChangeEvent, FormEvent, useState, useEffect } from "react"
import doAPICall from "../app/apiLayer"
import { useNavigate } from "react-router-dom"

export default function Home() {
    const token = useAppSelector((state) => state.tokenId)

    const [username, setUsername] = useState<string>("")
    const [usernameError, setUsernameError] = useState<string | null>(null)

    const dispatch = useDispatch()
    const navigate = useNavigate()

    useEffect(() => {
        dispatch(setHeaderMode(HeaderMode.NONE))
    }, [])

    const navigateToFeed = () => {
        console.log("Navigate to Feed")
        // navigate to Feed
        dispatch(addErrorMessage("Feed isn't ready yet."))
    }

    const handleFormSubmit = (event: FormEvent) => {
        event.preventDefault()
        doAPICall('GET', `/get-profile/${username}`, dispatch, null, null, (body) => {
            navigate(`/u/${username}`)
        }, null, (error, body) => {
            setUsernameError("Sorry, no user exists with that handle.")
        })
    }

    const handleUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
        setUsername(event.target.value)
    }

    return (
        <div className="home--content">
            <section>
                <h2>A Twitter clone <em>(for now)</em></h2>
            </section>
            <section>
                <button className="largeButton" onClick={navigateToFeed}>View Community Feed</button>
            </section>
            <section>
                <div>
                    <form onSubmit={handleFormSubmit} >
                        <label htmlFor="finduser">Looking for someone?&nbsp;</label>
                        <input className="find-user--input" type="text" name="username" onChange={handleUsernameChange} value={username} id="finduser" />
                        {usernameError && <p className="find-user--error">{usernameError}</p>}
                    </form>
                </div>
                {token && <p>Testing only - your authentication token is {token}</p>}
            </section>
        </div>
    )
}