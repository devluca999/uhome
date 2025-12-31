import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Simple markdown renderer for basic formatting
 * Supports: bold (**text**), italic (*text*), lists (- item), links ([text](url))
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Simple markdown parsing
  const parseMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let inList = false

    lines.forEach((line, index) => {
      const trimmed = line.trim()

      // List item
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) {
          inList = true
          elements.push(
            <ul key={`list-${index}`} className="list-disc list-inside space-y-1 ml-4" />
          )
        }
        const listItem = trimmed.substring(2)
        const parsed = parseInlineMarkdown(listItem)
        elements.push(
          <li key={`item-${index}`} className="text-sm">
            {parsed}
          </li>
        )
      } else {
        if (inList) {
          inList = false
        }

        if (trimmed === '') {
          elements.push(<br key={`br-${index}`} />)
        } else {
          const parsed = parseInlineMarkdown(trimmed)
          elements.push(
            <p key={`p-${index}`} className="text-sm mb-2">
              {parsed}
            </p>
          )
        }
      }
    })

    return elements
  }

  const parseInlineMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = []
    let currentIndex = 0

    // Pattern for links: [text](url)
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
    // Pattern for bold: **text**
    const boldPattern = /\*\*([^*]+)\*\*/g
    // Pattern for italic: *text* (but not **text**)
    const italicPattern = /(?<!\*)\*([^*]+)\*(?!\*)/g

    const matches: Array<{
      start: number
      end: number
      type: 'link' | 'bold' | 'italic'
      content: string
      url?: string
    }> = []

    // Find all matches
    let match
    while ((match = linkPattern.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'link',
        content: match[1],
        url: match[2],
      })
    }
    while ((match = boldPattern.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'bold',
        content: match[1],
      })
    }
    while ((match = italicPattern.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'italic',
        content: match[1],
      })
    }

    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start)

    // Build parts
    matches.forEach((match, index) => {
      // Add text before match
      if (match.start > currentIndex) {
        parts.push(text.substring(currentIndex, match.start))
      }

      // Add match
      if (match.type === 'link') {
        parts.push(
          <a
            key={`link-${index}`}
            href={match.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80"
          >
            {match.content}
          </a>
        )
      } else if (match.type === 'bold') {
        parts.push(
          <strong key={`bold-${index}`} className="font-semibold">
            {match.content}
          </strong>
        )
      } else if (match.type === 'italic') {
        parts.push(
          <em key={`italic-${index}`} className="italic">
            {match.content}
          </em>
        )
      }

      currentIndex = match.end
    })

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex))
    }

    return parts.length > 0 ? parts : [text]
  }

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      {parseMarkdown(content)}
    </div>
  )
}
