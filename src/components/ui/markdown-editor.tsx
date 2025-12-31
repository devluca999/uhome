import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from './markdown-renderer'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  rows?: number
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Enter notes (markdown supported: **bold**, *italic*, - lists, [links](url))',
  disabled,
  className,
  rows = 6,
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Notes</label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          disabled={disabled}
          className="h-7 text-xs"
        >
          {showPreview ? (
            <>
              <EyeOff className="w-3 h-3 mr-1" />
              Edit
            </>
          ) : (
            <>
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </>
          )}
        </Button>
      </div>
      {showPreview ? (
        <div className="min-h-[120px] p-3 border border-input rounded-md bg-muted/30">
          {value ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-sm text-muted-foreground italic">{placeholder}</p>
          )}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
        />
      )}
    </div>
  )
}
