import { Component, type ReactNode } from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} showReset={true} />
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  onReset?: () => void
  showReset?: boolean
}

export function ErrorFallback({ error, onReset, showReset = false }: ErrorFallbackProps) {
  const isNetworkError =
    error?.message.includes('Failed to fetch') ||
    error?.message.includes('Network') ||
    error?.message.includes('500') ||
    error?.message.includes('infinite recursion')

  const isPermissionError =
    error?.message.includes('permission') ||
    error?.message.includes('unauthorized') ||
    error?.message.includes('403')

  const errorTitle = isNetworkError
    ? 'Connection Issue'
    : isPermissionError
      ? 'Access Denied'
      : 'Something Went Wrong'

  const errorDescription = isNetworkError
    ? "We couldn't connect to the server. Please check your internet connection and try again."
    : isPermissionError
      ? "You don't have permission to access this resource."
      : "An unexpected error occurred. We've been notified and are looking into it."

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <Card className="glass-card max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-stone-900">{errorTitle}</CardTitle>
          <CardDescription className="mt-2">{errorDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && import.meta.env.DEV && (
            <div className="p-3 bg-stone-100 rounded-lg">
              <p className="text-xs font-mono text-stone-600 break-all">
                {error.message || 'Unknown error'}
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showReset && onReset && (
              <Button onClick={onReset} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            )}
            <Button
              onClick={() => (window.location.href = '/')}
              variant="default"
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
