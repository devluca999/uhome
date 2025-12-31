import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'dark' | 'light'
export type ThemePreference = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme // Actual applied theme (dark or light)
  themePreference: ThemePreference // User's preference (dark, light, or system)
  setThemePreference: (preference: ThemePreference) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Get OS preference
function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    // Check settings context first (if available)
    try {
      const settings = localStorage.getItem('uhome-settings')
      if (settings) {
        const parsed = JSON.parse(settings)
        if (parsed.theme && ['dark', 'light', 'system'].includes(parsed.theme)) {
          return parsed.theme
        }
      }
    } catch (error) {
      // Ignore parse errors
    }

    // Fallback to legacy 'uhome-theme' key for backward compatibility
    const stored = localStorage.getItem('uhome-theme') as Theme | null
    if (stored === 'dark' || stored === 'light') {
      return stored
    }
    // Default to dark mode
    return 'dark'
  })

  const [theme, setTheme] = useState<Theme>(() => {
    if (themePreference === 'system') {
      return getSystemTheme()
    }
    return themePreference
  })

  // Update actual theme when preference changes or system preference changes
  useEffect(() => {
    if (themePreference === 'system') {
      const systemTheme = getSystemTheme()
      setTheme(systemTheme)

      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? 'dark' : 'light')
      }

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(handleChange)
        return () => mediaQuery.removeListener(handleChange)
      }
    } else {
      setTheme(themePreference)
    }
  }, [themePreference])

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
  }, [theme])

  const setThemePreference = (preference: ThemePreference) => {
    setThemePreferenceState(preference)
    // Update settings context if it exists
    try {
      const settings = localStorage.getItem('uhome-settings')
      if (settings) {
        const parsed = JSON.parse(settings)
        parsed.theme = preference
        parsed.useSystemTheme = preference === 'system'
        localStorage.setItem('uhome-settings', JSON.stringify(parsed))
      }
    } catch (error) {
      // Ignore errors
    }
    // Also update legacy key for backward compatibility
    if (preference !== 'system') {
      localStorage.setItem('uhome-theme', preference)
    }
  }

  const toggleTheme = () => {
    if (themePreference === 'system') {
      // If system, toggle to opposite of current system theme
      const systemTheme = getSystemTheme()
      setThemePreference(systemTheme === 'dark' ? 'light' : 'dark')
    } else {
      // Toggle between dark and light
      setThemePreference(themePreference === 'dark' ? 'light' : 'dark')
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, themePreference, setThemePreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
