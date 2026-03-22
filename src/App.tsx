import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/contexts/auth-context'
import { ThemeProvider } from '@/contexts/theme-context'
import { SettingsProvider } from '@/contexts/settings-context'
import { ErrorBoundary } from '@/components/error-boundary'
import { EnvironmentBadge } from '@/components/environment-badge'
import { router } from './router'

function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ThemeProvider>
          <AuthProvider>
            <RouterProvider router={router} />
            <EnvironmentBadge />
          </AuthProvider>
        </ThemeProvider>
      </SettingsProvider>
    </ErrorBoundary>
  )
}

export default App
