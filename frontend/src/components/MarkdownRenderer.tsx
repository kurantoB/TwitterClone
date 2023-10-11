import { useState, useEffect } from 'react'
import * as showdown from 'showdown'

type MarkdownRendererProps = {
    markdownText: string
}

export default function MarkdownRenderer({ markdownText }: MarkdownRendererProps) {
    const [html, setHtml] = useState('');

    useEffect(() => {
        const converter = new showdown.Converter()
        const htmlText = converter.makeHtml(markdownText.replaceAll('[', '\\['))
        setHtml(htmlText)
    }, [markdownText])

    return <div className="markdown-renderer" dangerouslySetInnerHTML={{ __html: html }} />
}