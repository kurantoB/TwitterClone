import { useDispatch } from "react-redux"
import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from "react-router-dom"
import { useAppSelector } from "../app/hooks"
import { HeaderMode, addErrorMessage, setHeaderMode } from "../app/appState"
import DisplayedPost from "../components/DisplayedPost"
import consts from "../consts"
import MarkdownRenderer from "../components/MarkdownRenderer"
import { processTags, removeLinksFromMarkdown } from "../utils"
import doAPICall from "../app/apiLayer"

export default function NewPost() {
    const accessToken = useAppSelector((state) => state.tokenId)
    const userExists = useAppSelector((state) => state.userExists)

    const dispatch = useDispatch()
    const navigate = useNavigate()

    const { replyingto } = useParams()
    const stash = useAppSelector((state) => state.stash)
    const [addedFromStash, setAddedFromStash] = useState<string | null>(null)

    const [postContents, setPostContents] = useState<string>("")
    const [postContentsError, setPostContentsError] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [selectedFileError, setSelectedFileError] = useState<string | null>(null)
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    useEffect(() => {
        if (!accessToken || !userExists) {
            navigate("/error")
            return
        }

        dispatch(setHeaderMode(HeaderMode.NONE))
    }, [selectedFile])

    const addFromStash = () => {
        setAddedFromStash(stash)
    }

    const errorCallback = (error: string) => {
        dispatch(addErrorMessage(error))
        console.log(`API error: error = ${error}`)
        window.scrollTo({ top: 0, behavior: 'smooth' as ScrollBehavior })

        navigate("/error")
    }

    const addFromStashErrorCallback = (error: string) => {
        dispatch(addErrorMessage(`Error adding stashed post: ${error}`))
        setAddedFromStash(null)
    }

    const handlePostContentsChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setPostContents(event.target.value)
        if (event.target.value.length > consts.MAX_POST_LENGTH) {
            setPostContentsError(`Post must not exceed ${consts.MAX_POST_LENGTH} characters.`)
        } else {
            setPostContentsError(null)
        }
    }

    const mediaClicked = () => {
        document.getElementById('fileInput')?.click();
    }

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files && event.target.files[0]
        if (file) {
            if (file.type === 'image/png' || file.type === 'image/jpeg') {
                if (file.size > consts.MAX_POST_MEDIA_BYTES) {
                    setSelectedFile(null)
                    setPreviewImage(null)
                    setSelectedFileError(`Media file size must not exceed ${Math.floor(consts.MAX_POST_MEDIA_BYTES / 1048576)} MB.`)
                } else {
                    setSelectedFileError(null)
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
                setSelectedFileError("Media file must be in PNG or JPEG format.")
            }
        } else {
            setSelectedFile(null)
            setPreviewImage(null)
            setSelectedFileError(null)
        }
    }

    const handleRemoveFile = () => {
        setSelectedFile(null)
        setPreviewImage(null)
        setSelectedFileError(null)
    }

    const handleFormSubmit = (event: FormEvent) => {
        event.preventDefault()

        let hasError = false

        if (postContents.length === 0 && !selectedFile) {
            setPostContentsError("Post must have some text unless you attach an image.")
            hasError = true
        }
        if (postContents.length > consts.MAX_POST_LENGTH) {
            setPostContentsError(`Post must not exceed ${consts.MAX_POST_LENGTH} characters.`)
            hasError = true
        }

        if (selectedFile) {
            if (selectedFile.type !== 'image/png' && selectedFile.type !== 'image/jpeg') {
                setSelectedFileError('Please select a valid PNG or JPEG file.')
                hasError = true
            } else if (selectedFile.size > consts.MAX_POST_MEDIA_BYTES) {
                setSelectedFileError(`Media size must not exceed ${Math.floor(consts.MAX_POST_MEDIA_BYTES / 1048576)} MB.`)
                hasError = true
            }
        }

        if (hasError) {
            dispatch(addErrorMessage("Unable to submit post - please fix the below issues before retrying."))
            window.scrollTo({ top: 0, behavior: 'smooth' as ScrollBehavior })
            return
        }

        const formData = new FormData()
        if (selectedFile) {
            formData.append('file', selectedFile)
        }
        formData.append('message', postContents)

        doAPICall(
            'POST',
            '/new-post',
            dispatch,
            navigate,
            accessToken,
            (body) => {
                if (body.formErrors) {
                    for (const formError of body.formErrors) {
                        const message = formError.split('/')[1]
                        switch (formError.split('/')[0]) {
                            case 'message':
                                setPostContentsError(message)
                                break
                            case 'media':
                                setSelectedFileError(message)
                                break
                        }
                    }
                    dispatch(addErrorMessage("Unable to submit post - please fix the below issues before retrying."))
                    window.scrollTo({ top: 0, behavior: 'smooth' as ScrollBehavior })
                } else if (body.postId) {
                    // navigate(`/p/${body.postId}`) TODO: implement
                    navigate("/home")
                } else {
                    navigate("/error")
                }
            },
            {
                visibility: "everyone", // TODO: implement
                parentPost1: replyingto,
                parentPost2: addedFromStash
            }
        )
    }

    return (
        <div className="newpost--content">
            <h2>{replyingto ? "Reply" : "New post"}</h2>
            {replyingto &&
                <div className="newpost--parents">
                    <DisplayedPost expanded={true} postId={replyingto} showFlag={false} showStashable={false} viewerUserExists={true} retrieveErrorCallback={errorCallback} />
                    {!addedFromStash && stash && <button className="largeButton" onClick={addFromStash}>Add post from stash</button>}
                    {addedFromStash &&
                        <DisplayedPost expanded={true} postId={addedFromStash} showFlag={false} showStashable={false} viewerUserExists={true} retrieveErrorCallback={addFromStashErrorCallback} />
                    }
                </div>
            }
            <div className="newpost--input">
                {replyingto &&
                    <div className="newpost--input-repliesgraphic">
                        <svg xmlns="http://www.w3.org/2000/svg"><g id="grid_system" /><g id="_icons"><path d="M22,13.5c0-2.3-1.8-4.2-4-4.5c-0.2-2.8-2.6-5-5.4-5H7.5C6,4,4.6,4.6,3.6,5.6C2.6,6.6,2,8,2,9.5c0,1.2,0.4,2.3,1,3.2l-1,3   c-0.1,0.4,0,0.8,0.3,1.1C2.5,16.9,2.8,17,3,17c0.2,0,0.3,0,0.4-0.1l4-2c0,0,0,0,0,0h1.8c0.2,0.5,0.4,1,0.7,1.4   c0.9,1.1,2.1,1.7,3.5,1.7h2.3l3.8,1.9C19.7,20,19.8,20,20,20c0.2,0,0.5-0.1,0.7-0.2c0.3-0.3,0.4-0.7,0.3-1.1L20.4,17   c0.1-0.1,0.2-0.2,0.3-0.3C21.5,15.8,22,14.7,22,13.5z M7.3,12.9c-0.2,0-0.4,0-0.6,0.1l-2.1,1l0.4-1.3c0.1-0.3,0-0.7-0.2-1   C4.3,11.1,4,10.3,4,9.5C4,8.5,4.4,7.7,5,7c0.7-0.7,1.5-1,2.4-1h5.1c1.8,0,3.2,1.3,3.4,3h-2.5c-1.2,0-2.3,0.5-3.2,1.3   c-0.7,0.7-1.1,1.5-1.3,2.4c0,0.1,0,0.1,0,0.2H7.5C7.4,12.9,7.4,12.9,7.3,12.9z M19.3,15.3c-0.2,0.2-0.4,0.3-0.6,0.4   c-0.4,0.2-0.6,0.7-0.5,1.2l0.1,0.2l-1.8-0.9C16.3,16,16.2,16,16,16h-2.5c-0.8,0-1.5-0.3-2-1c-0.3-0.4-0.5-0.8-0.5-1.2   c0-0.1,0-0.2,0-0.3c0-0.1,0-0.3,0-0.4c0.1-0.5,0.3-1,0.7-1.3c0.5-0.5,1.1-0.7,1.8-0.7H17h0.5c1.4,0,2.5,1.1,2.5,2.5   C20,14.2,19.7,14.8,19.3,15.3z" /></g></svg>
                    </div>
                }
                <form onSubmit={handleFormSubmit} className="create-account--form" >
                    <p className="newpost--input--smallcaption">Markdown input (<a href="https://www.markdownguide.org/basic-syntax/">?</a>), {consts.MAX_POST_LENGTH - postContents.length} ch. left</p>
                    <div className="newpost--textarea-container">
                        <textarea name="postContents" onChange={handlePostContentsChange} value={postContents} />
                    </div>
                    {postContentsError && <p className="new-post--error">{postContentsError}</p>}
                    <h3>Short preview</h3>
                    <MarkdownRenderer markdownText={processTags(removeLinksFromMarkdown(getPreviewSubstring(postContents)))} />
                    <h3>Expanded preview</h3>
                    <MarkdownRenderer markdownText={processTags(removeLinksFromMarkdown(postContents))} />
                    <hr />
                    <div>
                        <div className="newpost--media">
                            {selectedFile &&
                                <>
                                    <img src={previewImage ?? ''} />
                                    <svg onClick={handleRemoveFile} fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><rect height="18" rx="2" ry="2" width="18" x="3" y="3" /><line x1="9" x2="15" y1="9" y2="15" /><line x1="15" x2="9" y1="9" y2="15" /></svg>
                                </>
                            }
                            {!selectedFile &&
                                <svg onClick={mediaClicked} fill="none" height="24" stroke-width="1.5" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">Attach image<path d="M21 3.6V20.4C21 20.7314 20.7314 21 20.4 21H3.6C3.26863 21 3 20.7314 3 20.4V3.6C3 3.26863 3.26863 3 3.6 3H20.4C20.7314 3 21 3.26863 21 3.6Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /><path d="M3 16L10 13L21 18" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /><path d="M16 10C14.8954 10 14 9.10457 14 8C14 6.89543 14.8954 6 16 6C17.1046 6 18 6.89543 18 8C18 9.10457 17.1046 10 16 10Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" /></svg>
                            }
                            {selectedFileError && <p className="newpost--error">{selectedFileError}</p>}
                        </div>
                        <button className="largeButton">Post</button>
                    </div>
                    <input
                        type="file"
                        id="fileInput"
                        style={{ display: 'none' }}
                        accept=".png, .jpg, .jpeg"
                        onChange={handleFileChange}
                    />
                </form>
            </div>
        </div>
    )
}

function getPreviewSubstring(message: string) {
    let extensionStartIndex = message.length > consts.MAX_POST_PREVIEW_LENGTH ? consts.MAX_POST_PREVIEW_LENGTH : -1
    const tentativePreview = message.substring(0, consts.MAX_POST_PREVIEW_LENGTH)
    if ((tentativePreview.match(/\n/g) || []).length >= consts.MAX_POST_PREVIEW_LINES) {
        let newLineOccurrences = 0
        for (let i = 0; i < message.length; i++) {
            if (message[i] === '\n') {
                newLineOccurrences++
                if (newLineOccurrences === consts.MAX_POST_PREVIEW_LINES) {
                    extensionStartIndex = i
                    break
                }
            }
        }
    }
    return message.substring(0, extensionStartIndex)
}