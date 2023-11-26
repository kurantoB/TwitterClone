import { useState, useEffect } from 'react'
import * as showdown from 'showdown'

type MarkdownRendererProps = {
    markdownText: string
}

export default function MarkdownRenderer({ markdownText }: MarkdownRendererProps) {
    const [html, setHtml] = useState('');

    useEffect(() => {
        const converter = new showdown.Converter()
        setHtml(converter.makeHtml(markdownText))
    }, [markdownText])

    return <div className="markdown-renderer" dangerouslySetInnerHTML={{ __html: html }} />
}