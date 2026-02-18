import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type NavLayout = 'header' | 'sidebar'
export type DashboardTimeline = 'monthly' | 'quarterly' | 'yearly'

export type NotificationFrequency = 'immediate' | 'digest' | 'disabled'

export interface Settings {
  theme: ThemePreference
  dashboardTimeline: DashboardTimeline
  useSystemTheme: boolean
  navLayout: NavLayout
  reduceMotion: boolean
  compactMode: boolean
  denseTables: boolean
  showTooltips: boolean
  hiddenNavItems: string[]
  navItemOrder: string[]
  inAppNotifications: boolean
  toastReminders: boolean
  notificationSound: boolean
  notificationFrequency: NotificationFrequency
  currency: string
  userName?: string
  organizationName?: string
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  dashboardTimeline: 'monthly',
  useSystemTheme: false,
  navLayout: 'header',
  reduceMotion: false,
  compactMode: false,
  denseTables: false,
  showTooltips: true,
  hiddenNavItems: [],
  navItemOrder: [],
  inAppNotifications: true,
  toastReminders: true,
  notificationSound: false,
  notificationFrequency: 'immediate',
  currency: 'USD',
}

const SETTINGS_STORAGE_KEY = 'uhome-settings'

interface SettingsContextType {
  settings: Settings
  updateSettings: (updates: Partial<Settings>) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    // Load from localStorage
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Settings>
        return { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
    return DEFAULT_SETTINGS
  })

  // Persist to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }, [settings])

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
