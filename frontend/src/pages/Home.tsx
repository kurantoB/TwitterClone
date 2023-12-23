import { useDispatch } from "react-redux"
import { HeaderMode, addErrorMessage, setHeaderMode } from "../app/appState"
import { ChangeEvent, FormEvent, useState, useEffect } from "react"
import doAPICall from "../app/apiLayer"
import { useNavigate } from "react-router-dom"

export default function Home() {
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
            setUsernameError("Sorry, failed to find user with that handle.")
        })
    }

    const handleUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
        setUsername(event.target.value)
    }

    return (
        <div className="home--content">
            <section className="home--heading">
                <div>
                    <h1>Welcome to Aloft.io</h1>
                </div>
                <div>
                    <h2><em>Twitter, the indie version</em></h2>
                </div>
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
            </section>
        </div>
    )
}