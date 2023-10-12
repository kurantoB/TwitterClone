import { ChangeEvent, FormEvent, useState } from "react"
import consts from "../consts"
import MarkdownRenderer from "../components/MarkdownRenderer"
import doAPICall from "../app/apiLayer"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { addErrorMessage, findUser } from "../app/appState"
import connectSocket from "../app/socket"
import DisplayCard from "../components/DisplayCard"

export default function CreateAccount() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [username, setUsername] = useState<string>("")
    const [bio, setBio] = useState<string>("")
    const [shortBio, setShortBio] = useState<string>("")

    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [avatarError, setAvatarError] = useState<string | null>(null)
    const [usernameError, setUsernameError] = useState<string | null>(null)
    const [bioError, setBioError] = useState<string | null>(null)
    const [shortBioError, setShortBioError] = useState<string | null>(null)

    const dispatch = useAppDispatch()
    const accessToken = useAppSelector((state) => state.tokenId)

    const handleFormSubmit = (event: FormEvent) => {
        event.preventDefault()

        if (username.length < 1 || username.length > consts.MAX_USERNAME_LENGTH) {
            setUsernameError(`Handle must be between 1 and ${consts.MAX_USERNAME_LENGTH} characters.`)
        } else if (!/^[a-zA-Z0-9_]*$/.test(username)) {
            setUsernameError("Only letters, numbers, and underscores are permitted in the handle.")
        }
        if (selectedFile) {
            if (selectedFile.type !== 'image/png' && selectedFile.type !== 'image/jpeg') {
                setAvatarError('Please select a valid PNG or JPEG file.')
            } else if (selectedFile.size > consts.MAX_AVATAR_FILESIZE_BYTES) {
                setAvatarError(`Avatar file size must not exceed ${Math.floor(consts.MAX_AVATAR_FILESIZE_BYTES / 1024)} KB.`)
            }
        }

        if (bio.length > consts.MAX_BIO_LENGTH) {
            setBioError(`Bio must not exceed ${consts.MAX_BIO_LENGTH} characters.`)
        }

        if (usernameError || avatarError || bioError) {
            dispatch(addErrorMessage("Unable to create account - please fix the below issues before retrying."))
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        const formData = new FormData()
        if (selectedFile) {
            formData.append('file', selectedFile)
        }
        formData.append('username', username)
        formData.append('bio', bio)
        formData.append('shortBio', shortBio)

        doAPICall(
            "POST",
            "/api/create-account",
            dispatch,
            accessToken,
            (body: any) => {
                if (body.formErrors) {
                    for (const formError in body.formErrors) {
                        const message = formError.split('/')[1]
                        switch (formError.split('/')[0]) {
                            case 'avatar':
                                setAvatarError(message)
                                break
                            case 'username':
                                setUsernameError(message)
                                break
                            case 'bio':
                                setBioError(message)
                                break
                        }
                    }
                    dispatch(addErrorMessage("Unable to create account - please fix the below issues before retrying."))
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                } else {
                    doAPICall('GET', '/auth/get-user', dispatch, accessToken, (body: any) => {
                        if (body.userId) {
                            dispatch(findUser())
                            // user account exists for this Google ID - connect to websocket service
                            connectSocket(body.userId, dispatch)
                        }
                    })

                    console.log("Navigate to Profile")
                    // navigate to Profile
                    dispatch(addErrorMessage("Profile page isn't ready yet."))
                }
            },
            formData,
            (status, body) => {
                window.scrollTo({ top: 0, behavior: 'smooth' })
            }
        )
    }

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files && event.target.files[0]
        if (file) {
            if (file.type === 'image/png' || file.type === 'image/jpeg') {
                if (file.size > consts.MAX_AVATAR_FILESIZE_BYTES) {
                    setSelectedFile(null)
                    setPreviewImage(null)
                    setAvatarError(`Avatar file size must not exceed ${Math.floor(consts.MAX_AVATAR_FILESIZE_BYTES / 1024)} KB.`)
                } else {
                    setAvatarError(null)
                    setSelectedFile(file)

                    // Generate a preview image URL
                    const reader = new FileReader()
                    reader.onload = () => {
                        setPreviewImage(reader.result as string)
                    }
                    reader.readAsDataURL(file)
                }
            } else {
                setSelectedFile(null)
                setPreviewImage(null)
                setAvatarError('Please select a valid PNG or JPEG file.')
            }
        } else {
            setSelectedFile(null)
            setPreviewImage(null)
            setAvatarError(null)
        }
    }

    const handleUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
        setUsername(event.target.value)
        if (event.target.value.length > consts.MAX_USERNAME_LENGTH) {
            setUsernameError(`Handle must be between 1 and ${consts.MAX_USERNAME_LENGTH} characters.`)
        } else if (!/^[a-zA-Z0-9_]*$/.test(event.target.value)) {
            setUsernameError("Only letters, numbers, and underscores are permitted in the handle.")
        } else {
            setUsernameError(null)
        }
    }

    const handleShortBioChange = (event: ChangeEvent<HTMLInputElement>) => {
        setShortBio(event.target.value)
        if (event.target.value.length > consts.MAX_SHORT_BIO_LENGTH) {
            setShortBioError(`Caption must not exceed ${consts.MAX_SHORT_BIO_LENGTH} characters.`)
        } else {
            setShortBioError(null)
        }
    }

    const handleBioChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setBio(event.target.value)
        if (event.target.value.length > consts.MAX_BIO_LENGTH) {
            setBioError(`Bio must not exceed ${consts.MAX_BIO_LENGTH} characters.`)
        } else {
            setBioError(null)
        }
    }

    return (
        <div className="create-account">
            <h1>Tell us about yourself</h1>
            <form onSubmit={handleFormSubmit} className="create-account--form" >
                <div>
                    <DisplayCard
                        avatarImage={previewImage}
                        username={username}
                        shortBio={shortBio}
                    />
                    <label className="create-account--smallcaption" htmlFor="avatar">Upload Avatar:</label>
                    <input
                        type="file"
                        id="avatar"
                        name="avatar"
                        accept=".png, .jpg, .jpeg"
                        onChange={handleFileChange}
                    />
                    {avatarError && <p className="create-account--error">{avatarError}</p>}
                </div>
                <hr />
                <div>
                    <div className="create-account--smallinputs">
                        <div>
                            <h2>Choose a handle</h2>
                            <input type="text" name="username" onChange={handleUsernameChange} value={username} />
                            {usernameError && <p className="create-account--error">{usernameError}</p>}
                        </div>
                        <div>
                            <h2>Write a caption</h2>
                            <input className="create-account--captioninput" type="text" name="shortBio" onChange={handleShortBioChange} value={shortBio} />
                            {shortBioError && <p className="create-account--error">{shortBioError}</p>}
                        </div>
                    </div>
                </div>
                <hr />
                <div>
                    <h2>Build a profile</h2>
                    <p className="create-account--smallcaption">Markdown input (<a href="https://en.wikipedia.org/wiki/Markdown#Examples">?</a>)</p>
                    <p className="create-account--smallcaption">(Links and images not supported)</p>
                    <div className="create-account--textarea-container">
                        <textarea name="bio" onChange={handleBioChange} value={bio} />
                    </div>
                    {bioError && <p className="create-account--error">{bioError}</p>}
                    <h3>Preview</h3>
                    <MarkdownRenderer markdownText={bio} />
                </div>
                <hr />
                <div>
                    <button className="largeButton">Create Account</button>
                </div>
            </form>
        </div>
    )
}