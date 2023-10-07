import { useDispatch } from "react-redux"
import { addErrorMessage } from "../app/appState"
import { useAppSelector } from "../app/hooks"

export default function Home() {
    const dispatch = useDispatch()
    const accessToken = useAppSelector((state) => state.tokenId)

    const navigateToFeed = () => {
        console.log("Navigate to Feed")
        // navigate to Feed
        dispatch(addErrorMessage("Feed isn't ready yet."))
    }

    return (
        <div className="home--content">
            <section>
                <h2>A Twitter clone <em>(for now)</em></h2>
            </section>
            <section>
                <button className="largeButton" onClick={navigateToFeed}>View Community Feed</button>
            </section>
            {accessToken && <section><p>Testing only - your authentication token is {accessToken}</p></section>}
        </div>
    )
}