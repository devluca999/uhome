import { useState, useEffect } from 'react'
import { appEnvironment } from '@/config/environment'
import { motion } from 'framer-motion'
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card' // Unused
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { SettingsSection } from '@/components/settings/settings-section'
import { Drawer } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import { ThemePreview } from '@/components/settings/theme-preview'
import { NavItemReorder } from '@/components/settings/nav-item-reorder'
import { useAuth } from '@/contexts/auth-context'
import { useSettings } from '@/contexts/settings-context'
import type { DashboardTimeline } from '@/contexts/settings-context'
import { useTheme, type ThemePreference } from '@/contexts/theme-context'
import { useImageUpload } from '@/hooks/use-image-upload'
import { useSubscription } from '@/hooks/use-subscription'
import { useStripePortal } from '@/hooks/use-stripe-portal'
import { formatPrice } from '@/lib/stripe/plans'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Badge } from '@/components/ui/badge'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { Settings as SettingsIcon, LogOut, Trash2, Key, Check, Upload, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'

// Navigation items for landlord
const LANDLORD_NAV_ITEMS = [
  { path: '/landlord/dashboard', label: 'Dashboard', required: true },
  { path: '/landlord/finances', label: 'Finances', required: false },
  { path: '/landlord/properties', label: 'Properties', required: false },
  { path: '/landlord/tenants', label: 'Tenants', required: false },
  { path: '/landlord/operations', label: 'Operations', required: false },
  { path: '/landlord/documents', label: 'Documents', required: false },
]

// Navigation items for tenant (must match tenant-layout ALL_NAV_ITEMS)
const TENANT_NAV_ITEMS = [
  { path: '/tenant/dashboard', label: 'Dashboard', required: true },
  { path: '/tenant/finances', label: 'Payment History', required: false },
  { path: '/tenant/household', label: 'Household', required: false },
  { path: '/tenant/maintenance', label: 'Maintenance', required: false },
  { path: '/tenant/documents', label: 'Documents', required: false },
  { path: '/tenant/messages', label: 'Messages', required: false },
  { path: '/tenant/settings', label: 'Settings', required: false },
]

export function SettingsPage() {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()
  const { settings, updateSettings } = useSettings()
  const { themePreference, setThemePreference } = useTheme()
  const { uploadImage, uploading: uploadingAvatar, error: avatarError } = useImageUpload('avatars')
  const {
    plan,
    status: subscriptionStatus,
    stripeCustomerId,
    currentPeriodEnd,
    trialEnd,
    cancelAtPeriodEnd,
    loading: subscriptionLoading,
    error: subscriptionFetchError,
    config: planConfig,
  } = useSubscription()
  const { openPortal, loading: portalLoading, error: portalError } = useStripePortal()
  const [userName, setUserName] = useState(settings.userName || '')
  const [organizationName, setOrganizationName] = useState(settings.organizationName || '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null)

  const navItems = role === 'landlord' ? LANDLORD_NAV_ITEMS : TENANT_NAV_ITEMS

  // Update settings when local state changes
  useEffect(() => {
    updateSettings({ userName, organizationName })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, organizationName])

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

  const handleReorder = (newOrder: string[]) => {
    updateSettings({ navItemOrder: newOrder })
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const handleChangePassword = () => {
    setChangePasswordOpen(true)
    setNewPassword('')
    setConfirmPassword('')
    setChangePasswordError(null)
  }

  const handleSubmitChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangePasswordError(null)

    if (newPassword.length < 8) {
      setChangePasswordError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError('Passwords do not match')
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setChangePasswordOpen(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setChangePasswordError((error as Error).message)
    } finally {
      setChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        'Are you absolutely sure? This will permanently delete your account and all associated data. This action cannot be undone.'
      )
    ) {
      return
    }

    setDeleting(true)
    try {
      const supabaseUrl = appEnvironment.supabaseUrl
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const res = await fetch(`${supabaseUrl}/functions/v1/delete-own-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      })

      const result = await res.json().catch(err => {
        console.warn('[Settings] Failed to parse delete-account response:', err)
        return {} as Record<string, unknown>
      })
      if (!res.ok) throw new Error(result.error || 'Failed to delete account')

      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error deleting account:', error)
      alert(
        (error as Error).message?.includes('Not authenticated')
          ? 'Session expired. Please sign in again.'
          : 'Failed to delete account. Please contact support.'
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen">
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
            {/* Profile Picture */}
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="h-20 w-20 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-foreground">
                    {userName.charAt(0).toUpperCase() ||
                      user?.email?.charAt(0).toUpperCase() ||
                      'U'}
                  </div>
                )}
                <div className="flex-1">
                  {avatarError && <p className="text-sm text-destructive mb-2">{avatarError}</p>}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploadingAvatar}
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadingAvatar ? 'Uploading...' : 'Upload Picture'}
                    </Button>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file || !user?.id) return

                        const publicUrl = await uploadImage(file, user.id)
                        if (publicUrl) {
                          setAvatarUrl(publicUrl)
                        }
                        e.target.value = '' // Reset input
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">JPG, PNG or WebP. Max 2MB.</p>
                </div>
              </div>
            </div>

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
              <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <Label htmlFor="use-system-theme" className="text-sm">
                    Use system preference
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically follow your OS theme preference
                  </p>
                </div>
                <Switch
                  id="use-system-theme"
                  className="flex-shrink-0"
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
                    relative flex-1 p-4 rounded-md border-2 transition-all text-left
                    ${
                      settings.navLayout === 'header'
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  {settings.navLayout === 'header' && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="font-medium text-sm text-foreground mb-1">Header</div>
                  <p className="text-xs text-muted-foreground">Navigation at the top</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavLayoutChange('sidebar')}
                  className={`
                    relative flex-1 p-4 rounded-md border-2 transition-all text-left
                    ${
                      settings.navLayout === 'sidebar'
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  {settings.navLayout === 'sidebar' && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="font-medium text-sm text-foreground mb-1">Sidebar</div>
                  <p className="text-xs text-muted-foreground">Navigation on the side</p>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Navigation Items</Label>
              <p className="text-xs text-muted-foreground">
                Drag to reorder. Required pages cannot be reordered.
              </p>
              <NavItemReorder
                items={navItems}
                itemOrder={settings.navItemOrder}
                onReorder={handleReorder}
              />
            </div>
          </div>
        </SettingsSection>

        {/* Section: Dashboard (landlord only) */}
        {role === 'landlord' && (
          <SettingsSection
            title="Dashboard"
            description="Control how the dashboard displays financial summary"
          >
            <div className="space-y-3">
              <Label htmlFor="dashboard-timeline">Summary Period</Label>
              <p className="text-xs text-muted-foreground">
                Choose whether the dashboard shows monthly, quarterly, or yearly summary
              </p>
              <select
                id="dashboard-timeline"
                value={settings.dashboardTimeline ?? 'monthly'}
                onChange={e =>
                  updateSettings({
                    dashboardTimeline: e.target.value as DashboardTimeline,
                  })
                }
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 max-w-xs"
                data-testid="settings-dashboard-timeline"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </SettingsSection>
        )}

        {role === 'landlord' && (
          <SettingsSection
            title="Billing & subscription"
            description="Manage your plan and payment methods"
          >
            <div className="space-y-4">
              {subscriptionLoading ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Loading subscription…</p>
                </div>
              ) : subscriptionFetchError ? (
                <div className="p-3 rounded-md bg-destructive/20 border border-destructive/30">
                  <p className="text-sm text-destructive">{subscriptionFetchError}</p>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-md border-2 border-primary/50 bg-primary/10">
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">Current plan</span>
                      <Badge variant="default">{planConfig.name}</Badge>
                    </div>
                    <div className="space-y-1">
                      {plan !== 'free' &&
                        subscriptionStatus === 'active' &&
                        currentPeriodEnd &&
                        !cancelAtPeriodEnd && (
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(planConfig.monthlyPrice, 'month')} · Renews{' '}
                            {new Date(currentPeriodEnd).toLocaleDateString()}
                          </p>
                        )}
                      {subscriptionStatus === 'trialing' && trialEnd && (
                        <p className="text-xs text-amber-600 dark:text-amber-500">
                          Trial ends {new Date(trialEnd).toLocaleDateString()}
                        </p>
                      )}
                      {(subscriptionStatus === 'canceled' || cancelAtPeriodEnd) &&
                        currentPeriodEnd && (
                          <p className="text-xs text-destructive">
                            {cancelAtPeriodEnd && subscriptionStatus !== 'canceled'
                              ? 'Plan ends '
                              : 'Access ends '}
                            {new Date(currentPeriodEnd).toLocaleDateString()}
                          </p>
                        )}
                      {plan === 'free' && (
                        <p className="text-xs text-muted-foreground">
                          Upgrade for more properties, insights, and exports.
                        </p>
                      )}
                    </div>
                  </div>

                  {subscriptionStatus === 'trialing' && trialEnd && (
                    <div className="p-3 rounded-md bg-muted/50 border border-border">
                      <p className="text-sm text-foreground mb-1">
                        Your trial ends on{' '}
                        <strong>{new Date(trialEnd).toLocaleDateString()}</strong>.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Add a payment method to keep access after your trial.
                      </p>
                    </div>
                  )}

                  {portalError && (
                    <div className="p-3 rounded-md bg-destructive/20 border border-destructive/30">
                      <p className="text-sm text-destructive">{portalError}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    {stripeCustomerId ? (
                      <Button
                        type="button"
                        onClick={() => void openPortal()}
                        disabled={portalLoading}
                        className="flex-1"
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        {portalLoading ? 'Opening…' : 'Manage billing'}
                      </Button>
                    ) : plan !== 'free' ? (
                      <p className="text-xs text-muted-foreground py-2">
                        Billing portal is unavailable. Contact support to update payment details.
                      </p>
                    ) : null}

                    {plan === 'free' && (
                      <Button
                        type="button"
                        variant="default"
                        onClick={() => navigate('/landlord/subscription-plans')}
                        className="flex-1"
                      >
                        Upgrade plan
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </SettingsSection>
        )}

        {/* Section D: Interface Preferences */}
        <SettingsSection title="Interface Preferences" description="Adjust interface behavior">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50">
              <div className="min-w-0 flex-1 space-y-0.5">
                <Label htmlFor="reduce-motion" className="text-sm">
                  Reduce Motion
                </Label>
                <p className="text-xs text-muted-foreground">
                  Disable elastic transitions and bouncy animations
                </p>
              </div>
              <Switch
                id="reduce-motion"
                className="flex-shrink-0"
                checked={settings.reduceMotion}
                onCheckedChange={checked => updateSettings({ reduceMotion: checked })}
                aria-label="Reduce motion"
              />
            </div>

            <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50">
              <div className="min-w-0 flex-1 space-y-0.5">
                <Label htmlFor="compact-mode" className="text-sm">
                  Compact Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Reduce spacing and padding throughout the interface
                </p>
              </div>
              <Switch
                id="compact-mode"
                className="flex-shrink-0"
                checked={settings.compactMode}
                onCheckedChange={checked => updateSettings({ compactMode: checked })}
                aria-label="Compact mode"
              />
            </div>

            <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50">
              <div className="min-w-0 flex-1 space-y-0.5">
                <Label htmlFor="dense-tables" className="text-sm">
                  Dense Tables
                </Label>
                <p className="text-xs text-muted-foreground">Show more rows per page in tables</p>
              </div>
              <Switch
                id="dense-tables"
                className="flex-shrink-0"
                checked={settings.denseTables}
                onCheckedChange={checked => updateSettings({ denseTables: checked })}
                aria-label="Dense tables"
              />
            </div>

            <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50">
              <div className="min-w-0 flex-1 space-y-0.5">
                <Label htmlFor="show-tooltips" className="text-sm">
                  Show Tooltips
                </Label>
                <p className="text-xs text-muted-foreground">Display helpful tooltips on hover</p>
              </div>
              <Switch
                id="show-tooltips"
                className="flex-shrink-0"
                checked={settings.showTooltips}
                onCheckedChange={checked => updateSettings({ showTooltips: checked })}
                aria-label="Show tooltips"
              />
            </div>

            <div className="space-y-2 p-3 rounded-md bg-muted/50">
              <Label htmlFor="currency" className="text-sm">
                Currency
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select your preferred currency for displaying monetary values
              </p>
              <select
                id="currency"
                value={settings.currency}
                onChange={e => updateSettings({ currency: e.target.value })}
                className={cn(
                  'flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                <option value="USD">USD - US Dollar ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - British Pound (£)</option>
                <option value="CAD">CAD - Canadian Dollar (C$)</option>
                <option value="AUD">AUD - Australian Dollar (A$)</option>
                <option value="JPY">JPY - Japanese Yen (¥)</option>
                <option value="CNY">CNY - Chinese Yuan (¥)</option>
                <option value="INR">INR - Indian Rupee (₹)</option>
                <option value="MXN">MXN - Mexican Peso (Mex$)</option>
                <option value="BRL">BRL - Brazilian Real (R$)</option>
              </select>
            </div>
          </div>
        </SettingsSection>

        {/* Section E: Notifications */}
        <SettingsSection title="Notifications" description="Control notification preferences">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50">
              <div className="min-w-0 flex-1 space-y-0.5">
                <Label htmlFor="in-app-notifications" className="text-sm">
                  In-app Notifications
                </Label>
                <p className="text-xs text-muted-foreground">Show notifications within the app</p>
              </div>
              <Switch
                id="in-app-notifications"
                className="flex-shrink-0"
                checked={settings.inAppNotifications}
                onCheckedChange={checked => updateSettings({ inAppNotifications: checked })}
                aria-label="In-app notifications"
              />
            </div>

            <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50">
              <div className="min-w-0 flex-1 space-y-0.5">
                <Label htmlFor="toast-reminders" className="text-sm">
                  Toast Reminders
                </Label>
                <p className="text-xs text-muted-foreground">
                  Show toast notifications for reminders
                </p>
              </div>
              <Switch
                id="toast-reminders"
                className="flex-shrink-0"
                checked={settings.toastReminders}
                onCheckedChange={checked => updateSettings({ toastReminders: checked })}
                aria-label="Toast reminders"
              />
            </div>

            <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50">
              <div className="min-w-0 flex-1 space-y-0.5">
                <Label htmlFor="notification-sound" className="text-sm">
                  Notification Sound
                </Label>
                <p className="text-xs text-muted-foreground">
                  Play sound when notifications arrive
                </p>
              </div>
              <Switch
                id="notification-sound"
                className="flex-shrink-0"
                checked={settings.notificationSound}
                onCheckedChange={checked => updateSettings({ notificationSound: checked })}
                aria-label="Notification sound"
              />
            </div>

            <div className="space-y-2 p-3 rounded-md bg-muted/50">
              <Label htmlFor="notification-frequency" className="text-sm">
                Notification Frequency
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                How often you receive notifications
              </p>
              <select
                id="notification-frequency"
                value={settings.notificationFrequency}
                onChange={e => updateSettings({ notificationFrequency: e.target.value as any })}
                className={cn(
                  'flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                <option value="immediate">Immediate - Receive notifications as they happen</option>
                <option value="digest">Digest - Receive notifications in batches</option>
                <option value="disabled">Disabled - No notifications</option>
              </select>
            </div>
          </div>
        </SettingsSection>

        {/* Section F: Danger Zone */}
        <SettingsSection
          title="Danger Zone"
          description="Irreversible and destructive actions"
          className="border-destructive/50"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-md border-2 border-destructive/50 bg-destructive/5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold text-foreground">Log Out</Label>
                    <p className="text-xs text-muted-foreground mt-1">Sign out of your account</p>
                  </div>
                  <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Log Out
                  </Button>
                </div>

                <div className="pt-3 border-t border-destructive/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold text-foreground">
                        Change Password
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Update your account password
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleChangePassword}>
                      <Key className="w-4 h-4 mr-2" />
                      Change Password
                    </Button>
                  </div>
                </div>

                <Drawer
                  isOpen={changePasswordOpen}
                  onClose={() => {
                    setChangePasswordOpen(false)
                    setChangePasswordError(null)
                    setNewPassword('')
                    setConfirmPassword('')
                  }}
                  title="Change Password"
                  description="Enter a new password. Must be at least 8 characters."
                  side="bottom"
                >
                  <form onSubmit={handleSubmitChangePassword} className="space-y-4">
                    {changePasswordError && (
                      <p className="text-sm text-destructive">{changePasswordError}</p>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={8}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={8}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setChangePasswordOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1" disabled={changingPassword}>
                        {changingPassword ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </form>
                </Drawer>

                <div className="pt-3 border-t border-destructive/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold text-destructive">
                        Delete Account
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Permanently delete your account and all data. This cannot be undone.
                      </p>
                    </div>
                    <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deleting ? 'Deleting...' : 'Delete Account'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
