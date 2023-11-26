import { useEffect } from 'react'
import { useNavigate, useParams } from "react-router-dom"
import { useAppSelector } from "../app/hooks"

export default function NewPost() {
    const accessToken = useAppSelector((state) => state.tokenId)
    const userExists = useAppSelector((state) => state.userExists)
    const navigate = useNavigate()

    useEffect(() => {
        if (!accessToken || !userExists) {
            navigate("/error")
            return
        }
    }, [])

    const { replyingto } = useParams()


    if (replyingto) {

    }

    return (
        <></>
    )
}