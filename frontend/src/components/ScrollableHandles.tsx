import { Fragment } from "react"
import { User } from "../pages/ViewProfile"
import DisplayCard from "./DisplayCard"
import consts from "../consts"

export type ScrollableHandlesProps = {
    users: User[]
    navigateWrapperFunction: (destUsername: string) => void
    hasMore: boolean,
    loadMoreCallback: () => void
}

export default function ScrollableHandles({ users, navigateWrapperFunction, hasMore, loadMoreCallback }: ScrollableHandlesProps) {
    return (
        <>
            {users.length > 0 && <>
                <div className="view-profile--handles">
                    {users.map((user) => (
                        <Fragment key={user.id}>
                            <div className="view-profile--handle" onClick={() => {
                                navigateWrapperFunction(user.username)
                            }}>
                                <DisplayCard
                                    avatarImage={(user.avatar) ? `${consts.CLOUD_STORAGE_ROOT}/${consts.CLOUD_STORAGE_AVATAR_BUCKETNAME}/${user.avatar}` : `${window.location.origin}/images/user_icon.png`}
                                    username={user.username}
                                    shortBio={user.shortBio}
                                />
                            </div>
                        </Fragment>
                    ))}
                    {hasMore &&
                        <div className="view-profile--loadmore" onClick={loadMoreCallback}>
                            <p>Load more...</p>
                        </div>
                    }
                </div>
            </>}
            {users.length === 0 && <div className="view-profile--empty">
                <p>&lt;Empty&gt;</p>
            </div>
            }
        </>
    )
}