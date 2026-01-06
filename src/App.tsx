import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/contexts/auth-context'
import { ThemeProvider } from '@/contexts/theme-context'
import { SettingsProvider } from '@/contexts/settings-context'
import { TenantDevModeProvider } from '@/contexts/tenant-dev-mode-context'
import { LandlordDevModeProvider } from '@/contexts/landlord-dev-mode-context'
import { ErrorBoundary } from '@/components/error-boundary'
import { DevModeIndicator } from '@/components/dev-mode-indicator'
import { router } from './router'

function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ThemeProvider>
          <TenantDevModeProvider>
            <LandlordDevModeProvider>
              <AuthProvider>
                <DevModeIndicator />
                <RouterProvider router={router} />
              </AuthProvider>
            </LandlordDevModeProvider>
          </TenantDevModeProvider>
        </ThemeProvider>
      </SettingsProvider>
    </ErrorBoundary>
  )
}

export default App
