import consts from "../consts"

export type DisplayCardProps = {
    avatarImage: string | null
    username: string
    shortBio: string
}

export default function DisplayCard({
    avatarImage,
    username,
    shortBio
}: DisplayCardProps) {
    return (
        <div className="display-card">
            <div className="display-card--left">
                <div className="avatar-container-big">
                    <img src={avatarImage ? avatarImage : './images/user_icon.png'} />
                </div>
                <p className="display-card--handle">{(username ? username.substring(0, consts.MAX_USERNAME_LENGTH) : <br />)}</p>
            </div>
            {shortBio &&
                <div className="display-card--caption">
                    <p>{shortBio.substring(0, consts.MAX_SHORT_BIO_LENGTH)}</p>
                </div>
            }
        </div>
    )
}