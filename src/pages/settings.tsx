import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SettingsSection } from '@/components/settings/settings-section'
import { ThemePreview } from '@/components/settings/theme-preview'
import { NavItemReorder } from '@/components/settings/nav-item-reorder'
import { useAuth } from '@/contexts/auth-context'
import { useSettings } from '@/contexts/settings-context'
import { useTheme, type ThemePreference } from '@/contexts/theme-context'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { Settings as SettingsIcon } from 'lucide-react'

// Navigation items for landlord
const LANDLORD_NAV_ITEMS = [
  { path: '/landlord/dashboard', label: 'Dashboard', required: true },
  { path: '/landlord/finances', label: 'Finances', required: false },
  { path: '/landlord/properties', label: 'Properties', required: false },
  { path: '/landlord/tenants', label: 'Tenants', required: false },
  { path: '/landlord/operations', label: 'Operations', required: false },
  { path: '/landlord/documents', label: 'Documents', required: false },
]

// Navigation items for tenant
const TENANT_NAV_ITEMS = [
  { path: '/tenant/dashboard', label: 'Dashboard', required: true },
  { path: '/tenant/maintenance', label: 'Maintenance', required: false },
  { path: '/tenant/documents', label: 'Documents', required: false },
]

export function SettingsPage() {
  const { user, role } = useAuth()
  const { settings, updateSettings } = useSettings()
  const { themePreference, setThemePreference } = useTheme()
  const [userName, setUserName] = useState(settings.userName || '')
  const [organizationName, setOrganizationName] = useState(settings.organizationName || '')

  const navItems = role === 'landlord' ? LANDLORD_NAV_ITEMS : TENANT_NAV_ITEMS

  // Update settings when local state changes
  useEffect(() => {
    updateSettings({ userName, organizationName })
  }, [userName, organizationName, updateSettings])

  const handleThemeChange = (preference: ThemePreference) => {
    setThemePreference(preference)
    updateSettings({
      theme: preference,
      useSystemTheme: preference === 'system',
    })
  }

  const handleNavLayoutChange = (layout: 'header' | 'sidebar') => {
    updateSettings({ navLayout: layout })
  }

  const handleToggleVisibility = (path: string, hidden: boolean) => {
    const item = navItems.find(item => item.path === path)
    if (item?.required) return // Cannot hide required items

    const newHiddenItems = hidden
      ? [...settings.hiddenNavItems, path]
      : settings.hiddenNavItems.filter(p => p !== path)
    updateSettings({ hiddenNavItems: newHiddenItems })
  }

  const handleReorder = (newOrder: string[]) => {
    updateSettings({ navItemOrder: newOrder })
  }

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
          animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
          transition={{
            duration: durationToSeconds(motionTokens.duration.base),
            ease: motionTokens.easing.standard,
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-6 h-6 text-foreground" />
            <h1 className="text-4xl font-semibold text-foreground">Settings</h1>
          </div>
          <p className="text-muted-foreground">Personalize your uhome experience</p>
        </motion.div>

        {/* Section A: Account */}
        <SettingsSection title="Account" description="Your account information">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Name</Label>
              <Input
                id="user-name"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                value={user?.email || ''}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization-name">Organization Name</Label>
              <Input
                id="organization-name"
                value={organizationName}
                onChange={e => setOrganizationName(e.target.value)}
                placeholder="Your organization"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="px-3 py-2 bg-muted rounded-md">
                <span className="text-sm text-foreground capitalize">{role || 'N/A'}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Role is determined by your account type
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* Section B: Appearance */}
        <SettingsSection title="Appearance" description="Customize how uhome looks">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Theme</Label>
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-2">
                  <ThemePreview
                    theme="light"
                    selected={themePreference === 'light'}
                    onClick={() => handleThemeChange('light')}
                  />
                  <span className="text-xs text-muted-foreground">Light</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <ThemePreview
                    theme="dark"
                    selected={themePreference === 'dark'}
                    onClick={() => handleThemeChange('dark')}
                  />
                  <span className="text-xs text-muted-foreground">Dark</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleThemeChange('system')}
                    className={`
                      relative h-20 w-32 rounded-lg border-2 overflow-hidden cursor-pointer transition-all
                      ${
                        themePreference === 'system'
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#F5F5F5] to-[#111318]" />
                    <div className="absolute inset-0 p-2 flex flex-col gap-1">
                      <div className="h-2 rounded bg-white/20" />
                      <div className="h-1.5 rounded w-3/4 bg-white/20" />
                      <div className="h-1.5 rounded w-1/2 bg-white/20" />
                    </div>
                    {themePreference === 'system' && (
                      <div className="absolute top-1 right-1 h-3 w-3 rounded-full bg-primary" />
                    )}
                  </button>
                  <span className="text-xs text-muted-foreground">System</span>
                </div>
              </div>
            </div>

            {themePreference === 'system' && (
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="use-system-theme" className="text-sm">
                    Use system preference
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically follow your OS theme preference
                  </p>
                </div>
                <Switch
                  id="use-system-theme"
                  checked={settings.useSystemTheme}
                  onCheckedChange={checked => {
                    updateSettings({ useSystemTheme: checked })
                    if (!checked) {
                      handleThemeChange('dark') // Default to dark if system is disabled
                    }
                  }}
                  aria-label="Use system theme preference"
                />
              </div>
            )}
          </div>
        </SettingsSection>

        {/* Section C: Navigation Preferences */}
        <SettingsSection
          title="Navigation Preferences"
          description="Control how navigation is displayed"
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Navigation Layout</Label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleNavLayoutChange('header')}
                  className={`
                    flex-1 p-4 rounded-md border-2 transition-all text-left
                    ${
                      settings.navLayout === 'header'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <div className="font-medium text-sm text-foreground mb-1">Header</div>
                  <p className="text-xs text-muted-foreground">Navigation at the top</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavLayoutChange('sidebar')}
                  className={`
                    flex-1 p-4 rounded-md border-2 transition-all text-left
                    ${
                      settings.navLayout === 'sidebar'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <div className="font-medium text-sm text-foreground mb-1">Sidebar</div>
                  <p className="text-xs text-muted-foreground">Navigation on the side</p>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Navigation Items</Label>
              <p className="text-xs text-muted-foreground">
                Drag to reorder, toggle to show/hide. Required pages cannot be hidden.
              </p>
              <NavItemReorder
                items={navItems}
                hiddenItems={settings.hiddenNavItems}
                itemOrder={settings.navItemOrder}
                onToggleVisibility={handleToggleVisibility}
                onReorder={handleReorder}
              />
            </div>
          </div>
        </SettingsSection>

        {/* Section D: Interface Preferences */}
        <SettingsSection title="Interface Preferences" description="Adjust interface behavior">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="reduce-motion" className="text-sm">
                  Reduce Motion
                </Label>
                <p className="text-xs text-muted-foreground">
                  Disable elastic transitions and bouncy animations
                </p>
              </div>
              <Switch
                id="reduce-motion"
                checked={settings.reduceMotion}
                onCheckedChange={checked => updateSettings({ reduceMotion: checked })}
                aria-label="Reduce motion"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Section E: Notifications */}
        <SettingsSection title="Notifications" description="Control notification preferences">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="in-app-notifications" className="text-sm">
                  In-app Notifications
                </Label>
                <p className="text-xs text-muted-foreground">Show notifications within the app</p>
              </div>
              <Switch
                id="in-app-notifications"
                checked={settings.inAppNotifications}
                onCheckedChange={checked => updateSettings({ inAppNotifications: checked })}
                aria-label="In-app notifications"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="toast-reminders" className="text-sm">
                  Toast Reminders
                </Label>
                <p className="text-xs text-muted-foreground">
                  Show toast notifications for reminders
                </p>
              </div>
              <Switch
                id="toast-reminders"
                checked={settings.toastReminders}
                onCheckedChange={checked => updateSettings({ toastReminders: checked })}
                aria-label="Toast reminders"
              />
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
