import { ChangeEvent, FormEvent, useState, useEffect } from "react"
import consts from "../consts"
import MarkdownRenderer from "../components/MarkdownRenderer"
import doAPICall from "../app/apiLayer"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { HeaderMode, addErrorMessage, findUser, logout, setHeaderMode } from "../app/appState"
import connectSocket from "../app/socket"
import DisplayCard from "../components/DisplayCard"
import { useNavigate } from "react-router-dom"
import { User } from "./ViewProfile"
import { processTags, removeLinksFromMarkdown } from "../utils"

type CreateOrEditAccountProps = {
    edit: boolean
}

export default function CreateOrEditAccount({ edit }: CreateOrEditAccountProps) {
    const accessToken = useAppSelector((state) => state.tokenId)
    const userExists = useAppSelector((state) => state.userExists)
    const navigate = useNavigate()

    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [deleteAvatar, setDeleteAvatar] = useState<boolean>(false)
    const [username, setUsername] = useState<string>("")
    const [bio, setBio] = useState<string>("")
    const [shortBio, setShortBio] = useState<string>("")

    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [avatarError, setAvatarError] = useState<string | null>(null)
    const [usernameError, setUsernameError] = useState<string | null>(null)
    const [bioError, setBioError] = useState<string | null>(null)
    const [shortBioError, setShortBioError] = useState<string | null>(null)

    const dispatch = useAppDispatch()

    const [editUser, setEditUser] = useState<User | null>(null)

    useEffect(() => {
        if (
            !accessToken
            || (edit && !userExists)
            || (!edit && userExists)
        ) {
            navigate("/error")
            return
        }

        dispatch(setHeaderMode(HeaderMode.NONE))
        if (edit) {
            doAPICall('GET', '/get-username', dispatch, navigate, accessToken, (usernameBody) => {
                setUsername(usernameBody.username)
                doAPICall('GET', `/get-profile/${usernameBody.username}`, dispatch, navigate, accessToken, (profileBody) => {
                    setEditUser(profileBody.user)
                    setShortBio(profileBody.user.shortBio)
                    setBio(profileBody.user.bio)
                    doAPICall('GET', '/has-avatar', dispatch, navigate, accessToken, (avatarBody) => {
                        if (avatarBody.hasAvatar) {
                            const filePath = `${profileBody.user.id}_avatar`
                            const fileURL = `${consts.CLOUD_STORAGE_ROOT}/${consts.CLOUD_STORAGE_AVATAR_BUCKETNAME}/${filePath}`
                            setPreviewImage(fileURL)
                        }
                    })
                })
            })
        }
    }, [])

    const handleFormSubmit = (event: FormEvent) => {
        event.preventDefault()

        if (!edit) {
            if (username.length < 4 || username.length > consts.MAX_USERNAME_LENGTH) {
                setUsernameError(`Handle must be between 4 and ${consts.MAX_USERNAME_LENGTH} characters.`)
            } else if (!/^[a-zA-Z0-9_]*$/.test(username)) {
                setUsernameError("Only letters, numbers, and underscores are permitted in the handle.")
            }
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

        if (shortBio.length > consts.MAX_SHORT_BIO_LENGTH) {
            setShortBioError(`Caption must not exceed ${consts.MAX_SHORT_BIO_LENGTH} characters.`)
        }

        if (usernameError || avatarError || bioError) {
            dispatch(addErrorMessage(`Unable to ${edit ? "update" : "create"} account - please fix the below issues before retrying.`))
            window.scrollTo({ top: 0, behavior: 'smooth' as ScrollBehavior })
            return
        }

        const formData = new FormData()
        if (selectedFile && !deleteAvatar) {
            formData.append('file', selectedFile)
        }
        formData.append('isDeleteAvatar', deleteAvatar ? "true" : "false")
        if (!edit) {
            formData.append('username', username)
        }
        formData.append('bio', bio)
        formData.append('shortBio', shortBio)

        doAPICall(
            edit ? 'PATCH' : 'POST',
            edit ? '/update-account' : '/create-account',
            dispatch,
            navigate,
            accessToken,
            (createOrEditAccountBody) => {
                if (createOrEditAccountBody.formErrors) {
                    for (const i in createOrEditAccountBody.formErrors) {
                        const message = createOrEditAccountBody.formErrors[i].split('/')[1]
                        switch (createOrEditAccountBody.formErrors[i].split('/')[0]) {
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
                    dispatch(addErrorMessage(`Unable to ${edit ? "update" : "create"} account - please fix the below issues before retrying.`))
                    window.scrollTo({ top: 0, behavior: 'smooth' as ScrollBehavior })
                } else {
                    doAPICall('GET', '/get-userid', dispatch, navigate, accessToken, (userIdBody) => {
                        if (!edit) {
                            dispatch(findUser())
                            // user account exists for this Google ID - connect to websocket service
                            // connectSocket(userIdBody.userId, dispatch)
                        }
                        navigate(`/u/${username}`)
                    })
                }
            },
            formData
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

    const handleDeleteAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
        setDeleteAvatar(event.target.checked)
    }

    const handleUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
        setUsername(event.target.value)
        if (!/^[a-zA-Z0-9_]*$/.test(event.target.value)) {
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

    const showModal = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        const modalElem = document.getElementById("deleteAccountModal")
        if (modalElem) {
            modalElem.style.display = "block"
        }
    }

    const handleDeleteAccount = () => {
        doAPICall('DELETE', '/delete-account', dispatch, navigate, accessToken, (_) => {
            dispatch((logout()))
            navigate("/")
        })
    }

    const closeModal = () => {
        const modalElem = document.getElementById("deleteAccountModal")
        if (modalElem) {
            modalElem.style.display = "none"
        }
    }

    return (
        <>
            {edit &&
                <div className="modal" id="deleteAccountModal">
                    <div className="modal-content">
                        <p>Are you sure you want to delete this account?</p>
                        <div className="modal-options">
                            <button className="linkButton" onClick={handleDeleteAccount}>Yes</button>
                            <button className="linkButton" onClick={closeModal}>No</button>
                        </div>
                    </div>
                </div>
            }
            <div className="create-account">
                {!edit && <h1>Tell us about yourself</h1>}
                {edit && <h1>Edit profile</h1>}
                <form onSubmit={handleFormSubmit} className="create-account--form" >
                    <div>
                        <DisplayCard
                            avatarImage={previewImage}
                            username={(edit && editUser) ? editUser.username : username}
                            shortBio={shortBio}
                        />
                        <label className="create-account--smallcaption" htmlFor="avatar">{edit ? "Change avatar" : "Upload Avatar:"}</label>
                        <input
                            type="file"
                            id="avatar"
                            name="avatar"
                            accept=".png, .jpg, .jpeg"
                            onChange={handleFileChange}
                            disabled={deleteAvatar}
                        />
                        {avatarError && <p className="create-account--error">{avatarError}</p>}
                        {edit && editUser?.avatar && <>
                            <input type="checkbox" id="isDeleteAvatar" name="isDeleteAvatar" onChange={handleDeleteAvatarChange} checked={deleteAvatar} />
                            <label className="create-account--smallcaption" htmlFor="avatar">Delete avatar</label>
                        </>}
                    </div>
                    <hr />
                    <div>
                        <div className="create-account--smallinputs">
                            {!edit &&
                                <div>
                                    <h2>Choose a handle</h2>
                                    <input type="text" name="username" onChange={handleUsernameChange} value={username} />
                                    {usernameError && <p className="create-account--error">{usernameError}</p>}
                                </div>
                            }
                            <div>
                                <h2>Write a caption ({consts.MAX_SHORT_BIO_LENGTH - shortBio.length} ch. left)</h2>
                                <input className="create-account--captioninput" type="text" name="shortBio" onChange={handleShortBioChange} value={shortBio} />
                                {shortBioError && <p className="create-account--error">{shortBioError}</p>}
                            </div>
                        </div>
                    </div>
                    <hr />
                    <div>
                        <h2>Build a profile</h2>
                        <p className="create-account--smallcaption">Markdown input (<a href="https://www.markdownguide.org/basic-syntax/">?</a>)</p>
                        <p className="create-account--smallcaption">Note: images and non-explicit links aren't supported, {consts.MAX_BIO_LENGTH - bio.length} ch. left</p>
                        <div className="create-account--textarea-container">
                            <textarea name="bio" onChange={handleBioChange} value={bio} />
                        </div>
                        {bioError && <p className="create-account--error">{bioError}</p>}
                        <h3>Preview</h3>
                        <MarkdownRenderer markdownText={processTags(removeLinksFromMarkdown(bio))[0]} />
                    </div>
                    <hr />
                    <div>
                        <button className="largeButton">{edit ? "Update Profile" : "Create Account"}</button>
                    </div>
                    {edit &&
                        <div>
                            <button className="largeButton" onClick={showModal}>Delete Account</button>
                        </div>
                    }
                </form>
            </div>
        </>
    )
}