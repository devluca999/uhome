import { isRouteErrorResponse, useRouteError, useNavigate } from 'react-router-dom'
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()

  let errorTitle = 'Something Went Wrong'
  let errorDescription = 'An unexpected error occurred. Please try again.'
  let statusCode: number | undefined

  if (isRouteErrorResponse(error)) {
    statusCode = error.status
    switch (error.status) {
      case 404:
        errorTitle = 'Page Not Found'
        errorDescription = "The page you're looking for doesn't exist or has been moved."
        break
      case 403:
        errorTitle = 'Access Denied'
        errorDescription = "You don't have permission to access this page."
        break
      case 500:
        errorTitle = 'Server Error'
        errorDescription = "Something went wrong on our end. We're working to fix it."
        break
      default:
        errorTitle = `Error ${error.status}`
        errorDescription = error.statusText || errorDescription
    }
  } else if (error instanceof Error) {
    const isNetworkError =
      error.message.includes('Failed to fetch') ||
      error.message.includes('Network') ||
      error.message.includes('500')

    const isPermissionError =
      error.message.includes('permission') ||
      error.message.includes('unauthorized') ||
      error.message.includes('403')

    if (isNetworkError) {
      errorTitle = 'Connection Issue'
      errorDescription =
        "We couldn't connect to the server. Please check your internet connection and try again."
    } else if (isPermissionError) {
      errorTitle = 'Access Denied'
      errorDescription = "You don't have permission to access this resource."
    } else {
      errorTitle = 'Error'
      errorDescription = error.message || errorDescription
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <Card className="glass-card max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-stone-900">
            {errorTitle}
            {statusCode && <span className="ml-2 text-lg text-stone-400">({statusCode})</span>}
          </CardTitle>
          <CardDescription className="mt-2">{errorDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error instanceof Error && import.meta.env.DEV && (
            <div className="p-3 bg-stone-100 rounded-lg">
              <p className="text-xs font-mono text-stone-600 break-all">
                {error.stack || error.message || 'Unknown error'}
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
            <Button
              onClick={() => navigate('/')}
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
