import { useDispatch } from "react-redux"
import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from "react-router-dom"
import { useAppSelector } from "../app/hooks"
import { HeaderMode, addErrorMessage, setHeaderMode } from "../app/appState"
import DisplayedPost from "../components/DisplayedPost"
import consts from "../consts"
import MarkdownRenderer from "../components/MarkdownRenderer"
import { processTags, removeLinksFromMarkdown } from "../utils"

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

    useEffect(() => {
        if (!accessToken || !userExists) {
            navigate("/error")
            return
        }

        dispatch(setHeaderMode(HeaderMode.NONE))


    }, [])

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

    const handleFormSubmit = (event: FormEvent) => {
        event.preventDefault()

        {/* TODO */}
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
                    <MarkdownRenderer markdownText={processTags(removeLinksFromMarkdown(getPreviewSubstring(postContents)))[0]} />
                    <h3>Expanded preview</h3>
                    <MarkdownRenderer markdownText={processTags(removeLinksFromMarkdown(postContents))[0]} />
                    <hr />
                    <div>
                        <div className="newpost--media">
                            {/* TODO: Media */}
                        </div>
                        <button className="largeButton">Post</button>
                    </div>
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