import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorAlertProps {
  error: string | Error | null
  onDismiss?: () => void
  className?: string
}

export function ErrorAlert({ error, onDismiss, className = '' }: ErrorAlertProps) {
  if (!error) return null

  const errorMessage = error instanceof Error ? error.message : error

  return (
    <div
      className={`relative p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 ${className}`}
      role="alert"
    >
      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-red-900 mb-1">Error</h3>
        <p className="text-sm text-red-700 break-words">{errorMessage}</p>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="flex-shrink-0 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

