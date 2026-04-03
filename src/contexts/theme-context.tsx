import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'dark' | 'light'
export type ThemePreference = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  themePreference: ThemePreference
  setThemePreference: (preference: ThemePreference) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Write a cross-site cookie readable by getuhome.app landing page.
 *  Domain=.getuhome.app covers both app.getuhome.app and getuhome.app.
 *  Falls back silently in localhost / non-production environments.
 */
function writeCrossOriginThemeCookie(theme: 'dark' | 'light') {
  try {
    const isProd = window.location.hostname.endsWith('getuhome.app')
    const domain = isProd ? '; domain=.getuhome.app' : ''
    document.cookie = `uhome-theme=${theme}; path=/${domain}; SameSite=Lax; max-age=31536000`
  } catch {
    // Ignore — cookies may be blocked in some browser settings
  }
}

/** Read the cross-site theme cookie (set by either app or landing page). */
function readCrossOriginThemeCookie(): Theme | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)uhome-theme=(dark|light)/)
    return match ? (match[1] as Theme) : null
  } catch {
    return null
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    try {
      const settings = localStorage.getItem('uhome-settings')
      if (settings) {
        const parsed = JSON.parse(settings)
        if (parsed.theme && ['dark', 'light', 'system'].includes(parsed.theme)) {
          return parsed.theme
        }
      }
    } catch { /* ignore */ }

    const stored = localStorage.getItem('uhome-theme') as Theme | null
    if (stored === 'dark' || stored === 'light') return stored

    // Fall back to cross-site cookie (set by landing page or previous app session)
    const cookie = readCrossOriginThemeCookie()
    if (cookie) return cookie

    return 'dark'
  })

  const [theme, setTheme] = useState<Theme>(() => {
    if (themePreference === 'system') return getSystemTheme()
    return themePreference
  })

  useEffect(() => {
    if (themePreference === 'system') {
      const systemTheme = getSystemTheme()
      setTheme(systemTheme)
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light')
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
      } else {
        mediaQuery.addListener(handleChange)
        return () => mediaQuery.removeListener(handleChange)
      }
    } else {
      setTheme(themePreference)
    }
  }, [themePreference])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
  }, [theme])

  const setThemePreference = (preference: ThemePreference) => {
    setThemePreferenceState(preference)
    try {
      const settings = localStorage.getItem('uhome-settings')
      if (settings) {
        const parsed = JSON.parse(settings)
        parsed.theme = preference
        parsed.useSystemTheme = preference === 'system'
        localStorage.setItem('uhome-settings', JSON.stringify(parsed))
      }
    } catch { /* ignore */ }
    if (preference !== 'system') {
      localStorage.setItem('uhome-theme', preference)
      writeCrossOriginThemeCookie(preference)
    }
  }

  const toggleTheme = () => {
    if (themePreference === 'system') {
      const systemTheme = getSystemTheme()
      setThemePreference(systemTheme === 'dark' ? 'light' : 'dark')
    } else {
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
  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
