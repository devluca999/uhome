import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminUsers, type AdminUser } from '@/hooks/admin/use-admin-users'
import { useAdminUserActions } from '@/hooks/admin/use-admin-user-actions'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Search,
  Ban,
  Unlock,
  Lock,
  Key,
  LogOut,
  Shield,
  ShieldOff,
  X,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useModalScrollLock } from '@/hooks/use-modal-scroll-lock'
import { useReducedMotion } from '@/lib/motion'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'
import { createSpring, motionTokens } from '@/lib/motion'
import { cn } from '@/lib/utils'

// Date formatting helper
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

interface AdminActionModalProps {
  isOpen: boolean
  onClose: () => void
  user: AdminUser | null
  action: string
  onConfirm: (reason?: string) => Promise<void>
}

function AdminActionModal({ isOpen, onClose, user, action, onConfirm }: AdminActionModalProps) {
  const [reason, setReason] = useState('')
  const [confirmationText, setConfirmationText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'warning' | 'confirm'>('warning')
  const cardSpring = createSpring('card')
  useModalScrollLock(isOpen)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (!isOpen) {
      setReason('')
      setConfirmationText('')
      setError(null)
      setStep('warning')
    }
  }, [isOpen])

  const actionLabels: Record<
    string,
    {
      title: string
      description: string
      destructive?: boolean
      requiresConfirmation?: boolean
      warningText?: string
      confirmationPrompt?: string
    }
  > = {
    ban: {
      title: 'Ban User',
      description:
        'This will permanently ban the user from accessing the platform. This action cannot be easily undone.',
      destructive: true,
      requiresConfirmation: true,
      warningText:
        'This is a permanent action. The user will lose all access to the platform immediately.',
      confirmationPrompt: "Type the user's email to confirm",
    },
    unban: {
      title: 'Unban User',
      description: "This will restore the user's access to the platform.",
    },
    lock: {
      title: 'Lock Account',
      description: "This will temporarily lock the user's account, preventing login.",
      destructive: true,
      requiresConfirmation: true,
      warningText: 'The user will be unable to log in until the account is unlocked.',
      confirmationPrompt: "Type the user's email to confirm",
    },
    unlock: {
      title: 'Unlock Account',
      description: "This will restore the user's account access.",
    },
    suspend: {
      title: 'Suspend Account',
      description: "This will suspend the user's account, restricting access.",
      destructive: true,
      requiresConfirmation: true,
      warningText: 'The user will lose access until the account is unsuspended.',
      confirmationPrompt: "Type the user's email to confirm",
    },
    unsuspend: {
      title: 'Unsuspend Account',
      description: "This will restore the user's account access.",
    },
    reset_password: {
      title: 'Reset Password',
      description: 'This will send a password reset email to the user.',
      requiresConfirmation: true,
      confirmationPrompt: "Type the user's email to confirm",
    },
    force_logout: {
      title: 'Force Logout',
      description: 'This will invalidate all active sessions for the user.',
      destructive: true,
      requiresConfirmation: true,
      warningText: 'The user will be logged out from all devices immediately.',
      confirmationPrompt: "Type the user's email to confirm",
    },
    delete: {
      title: 'Delete User',
      description:
        'This will permanently delete the user account and all associated data. This action cannot be undone.',
      destructive: true,
      requiresConfirmation: true,
      warningText:
        'WARNING: This will permanently delete the user account, all their data, and cannot be undone. This is an irreversible action.',
      confirmationPrompt: 'Type DELETE to confirm permanent deletion',
    },
  }

  const actionInfo = actionLabels[action] || { title: action, description: '' }
  const requiresConfirmation = actionInfo.requiresConfirmation || false
  const userEmail = user?.email || ''

  async function handleConfirm() {
    // For destructive actions, require email confirmation
    if (requiresConfirmation && step === 'warning') {
      // Validate confirmation text
      if (action === 'delete') {
        if (confirmationText !== 'DELETE') {
          setError('Please type DELETE exactly to confirm deletion')
          return
        }
      } else {
        if (confirmationText.toLowerCase() !== userEmail.toLowerCase()) {
          setError(`Please type the user's email (${userEmail}) exactly to confirm`)
          return
        }
      }
      // Move to confirmation step
      setStep('confirm')
      setError(null)
      return
    }

    // Final confirmation
    try {
      setSubmitting(true)
      setError(null)
      await onConfirm(reason || undefined)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform action')
      setStep('warning') // Go back to warning step on error
    } finally {
      setSubmitting(false)
    }
  }

  const canProceed = requiresConfirmation
    ? step === 'confirm' ||
      (step === 'warning' &&
        (action === 'delete'
          ? confirmationText === 'DELETE'
          : confirmationText.toLowerCase() === userEmail.toLowerCase()))
    : true

  if (!isOpen || !user) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : motionTokens.duration.fast,
            ease: motionTokens.easing.standard,
          }}
          className="absolute inset-0 bg-background/90 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{
            type: 'spring',
            ...cardSpring,
          }}
          className="relative z-10 w-full max-w-md"
        >
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {actionInfo.destructive && (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    )}
                    {actionInfo.title}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    User: {user.email || user.id.substring(0, 8)}...
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 'warning' && (
                <>
                  <div
                    className={`p-4 rounded-lg border-2 ${
                      actionInfo.destructive
                        ? 'bg-destructive/10 border-destructive/50'
                        : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {actionInfo.destructive ? (
                        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p
                          className={`font-semibold mb-2 ${
                            actionInfo.destructive
                              ? 'text-destructive'
                              : 'text-yellow-900 dark:text-yellow-100'
                          }`}
                        >
                          {actionInfo.warningText || actionInfo.description}
                        </p>
                        <p
                          className={`text-sm ${
                            actionInfo.destructive
                              ? 'text-destructive/90'
                              : 'text-yellow-800 dark:text-yellow-200'
                          }`}
                        >
                          {actionInfo.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {requiresConfirmation && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {actionInfo.confirmationPrompt || `Type "${userEmail}" to confirm`}
                      </label>
                      <Input
                        placeholder={action === 'delete' ? 'Type DELETE' : userEmail}
                        value={confirmationText}
                        onChange={e => setConfirmationText(e.target.value)}
                        className="font-mono"
                      />
                      {action === 'delete' && (
                        <p className="text-xs text-muted-foreground">
                          This action is irreversible. All user data will be permanently deleted.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Reason {actionInfo.destructive ? '(required)' : '(optional)'}
                    </label>
                    <Textarea
                      placeholder="Enter reason for this action..."
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      rows={3}
                      required={actionInfo.destructive}
                    />
                    {actionInfo.destructive && !reason.trim() && (
                      <p className="text-xs text-destructive">
                        A reason is required for this action
                      </p>
                    )}
                  </div>
                </>
              )}

              {step === 'confirm' && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <p className="font-medium mb-2">Final Confirmation</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      You are about to perform: <strong>{actionInfo.title}</strong>
                    </p>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>User:</strong> {userEmail || user?.id.substring(0, 8)}...
                      </p>
                      <p>
                        <strong>Reason:</strong> {reason || 'No reason provided'}
                      </p>
                    </div>
                  </div>

                  {actionInfo.destructive && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        ⚠️ This is a destructive action. Click &quot;Confirm Action&quot; to proceed.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                {step === 'confirm' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep('warning')
                      setError(null)
                    }}
                    disabled={submitting}
                  >
                    ← Back
                  </Button>
                )}
                <div className={`flex items-center gap-2 ${step === 'confirm' ? 'ml-auto' : ''}`}>
                  <Button variant="outline" onClick={onClose} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button
                    variant={actionInfo.destructive ? 'destructive' : 'default'}
                    onClick={handleConfirm}
                    disabled={
                      submitting ||
                      (requiresConfirmation && step === 'warning' && !canProceed) ||
                      (actionInfo.destructive && !reason.trim() && step === 'warning')
                    }
                  >
                    {submitting
                      ? 'Processing...'
                      : step === 'confirm'
                        ? actionInfo.destructive
                          ? 'Confirm Action'
                          : 'Confirm'
                        : requiresConfirmation
                          ? 'Continue'
                          : 'Confirm'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export function AdminUsers() {
  // Track performance metrics
  usePerformanceTracker({ componentName: 'AdminUsers' })

  const [activeTab, setActiveTab] = useState<string>('landlords')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean
    user: AdminUser | null
    action: string
  }>({ isOpen: false, user: null, action: '' })
  const [toastMessage, setToastMessage] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  // Memoize filters to prevent unnecessary refetches
  const filters = useMemo(() => {
    const roleFilter: 'landlord' | 'tenant' | 'admin' | undefined =
      activeTab === 'landlords' ? 'landlord' : activeTab === 'tenants' ? 'tenant' : undefined
    const statusFilter: 'suspended_or_banned_or_locked' | undefined =
      activeTab === 'suspended' ? 'suspended_or_banned_or_locked' : undefined
    return {
      role: roleFilter,
      accountStatus: statusFilter,
    }
  }, [activeTab])

  const { users, loading, error, refetch } = useAdminUsers(filters)

  const {
    banUser,
    unbanUser,
    lockUser,
    unlockUser,
    suspendUser,
    unsuspendUser,
    resetPassword,
    forceLogout,
    deleteUser,
  } = useAdminUserActions()

  // Track if we need to refetch after an action
  const [needsRefetch, setNeedsRefetch] = useState(false)

  // Refetch users when modal closes after a successful action
  useEffect(() => {
    if (!actionModal.isOpen && needsRefetch) {
      setNeedsRefetch(false)
      // Refetch after modal closes
      refetch()
    }
  }, [actionModal.isOpen, needsRefetch, refetch])

  // Show toast notification
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  const filteredUsers = useMemo(() => {
    // Filter users based on active tab
    let tabFiltered = users
    if (activeTab === 'landlords') {
      tabFiltered = users.filter(u => u.role === 'landlord')
    } else if (activeTab === 'tenants') {
      tabFiltered = users.filter(u => u.role === 'tenant')
    } else if (activeTab === 'suspended') {
      tabFiltered = users.filter(
        u =>
          u.account_status === 'suspended' ||
          u.account_status === 'banned' ||
          u.account_status === 'locked'
      )
    }

    // Apply search filter
    if (!searchQuery.trim()) return tabFiltered

    const query = searchQuery.toLowerCase()
    return tabFiltered.filter(user => {
      const email = user.email?.toLowerCase() || ''
      const role = user.role?.toLowerCase() || ''
      const id = user.id.toLowerCase()
      const status = user.account_status?.toLowerCase() || ''
      return (
        email.includes(query) ||
        role.includes(query) ||
        id.includes(query) ||
        status.includes(query)
      )
    })
  }, [users, searchQuery, activeTab])

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-muted-foreground">Loading users...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-destructive">Error loading users: {error.message}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative">
      <GrainOverlay />
      <MatteLayer />
      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground mt-2">Manage system users and account status</p>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, role, or ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="landlords">
                Landlords ({users.filter(u => u.role === 'landlord').length})
              </TabsTrigger>
              <TabsTrigger value="tenants">
                Tenants ({users.filter(u => u.role === 'tenant').length})
              </TabsTrigger>
              <TabsTrigger value="suspended">
                Suspended (
                {
                  users.filter(
                    u =>
                      u.account_status === 'suspended' ||
                      u.account_status === 'banned' ||
                      u.account_status === 'locked'
                  ).length
                }
                )
              </TabsTrigger>
            </TabsList>

            {/* Landlords Tab */}
            <TabsContent value="landlords" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Landlords ({filteredUsers.length})</CardTitle>
                  <CardDescription>Landlord accounts in the system</CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery
                        ? 'No landlords found matching your search'
                        : 'No landlords found'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Email
                            </th>
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Status
                            </th>
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Created
                            </th>
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Last Sign In
                            </th>
                            <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map(user => (
                            <UserRow
                              key={user.id}
                              user={user}
                              onAction={action => setActionModal({ isOpen: true, user, action })}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tenants Tab */}
            <TabsContent value="tenants" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tenants ({filteredUsers.length})</CardTitle>
                  <CardDescription>Tenant accounts in the system</CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No tenants found matching your search' : 'No tenants found'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Email
                            </th>
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Status
                            </th>
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Created
                            </th>
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Last Sign In
                            </th>
                            <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map(user => (
                            <UserRow
                              key={user.id}
                              user={user}
                              onAction={action => setActionModal({ isOpen: true, user, action })}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Suspended Tab */}
            <TabsContent value="suspended" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Suspended / Flagged Accounts ({filteredUsers.length})</CardTitle>
                  <CardDescription>
                    Accounts with restrictions (suspended, banned, or locked)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery
                        ? 'No suspended accounts found matching your search'
                        : 'No suspended accounts found'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Email
                            </th>
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Role
                            </th>
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Status
                            </th>
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Created
                            </th>
                            <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map(user => (
                            <UserRow
                              key={user.id}
                              user={user}
                              onAction={action => setActionModal({ isOpen: true, user, action })}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Modal */}
          <AdminActionModal
            isOpen={actionModal.isOpen}
            onClose={() => setActionModal({ isOpen: false, user: null, action: '' })}
            user={actionModal.user}
            action={actionModal.action}
            onConfirm={async reason => {
              if (!actionModal.user) return

              let result
              switch (actionModal.action) {
                case 'ban':
                  result = await banUser(actionModal.user.id, reason)
                  break
                case 'unban':
                  result = await unbanUser(actionModal.user.id, reason)
                  break
                case 'lock':
                  result = await lockUser(actionModal.user.id, reason)
                  break
                case 'unlock':
                  result = await unlockUser(actionModal.user.id, reason)
                  break
                case 'suspend':
                  result = await suspendUser(actionModal.user.id, reason)
                  break
                case 'unsuspend':
                  result = await unsuspendUser(actionModal.user.id, reason)
                  break
                case 'reset_password':
                  result = await resetPassword(actionModal.user.id, reason)
                  break
                case 'force_logout':
                  result = await forceLogout(actionModal.user.id, reason)
                  break
                case 'delete':
                  result = await deleteUser(actionModal.user.id, reason)
                  break
                default:
                  throw new Error(`Unknown action: ${actionModal.action}`)
              }

              if (result.success) {
                setToastMessage({
                  message: `User ${actionModal.action} completed successfully. Audit log: ${result.auditLogId?.substring(0, 8)}...`,
                  type: 'success',
                })
                setNeedsRefetch(true)
              } else {
                throw new Error(result.error || 'Failed to perform action')
              }
            }}
          />

          {/* Toast Notification */}
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                'fixed top-4 right-4 z-50 rounded-lg px-4 py-3 shadow-lg backdrop-blur-md flex items-center gap-3 min-w-[300px] max-w-md',
                toastMessage.type === 'success'
                  ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
                  : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
              )}
            >
              <p className="flex-1 text-sm">{toastMessage.message}</p>
              <button
                onClick={() => setToastMessage(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

// User Row Component
interface UserRowProps {
  user: AdminUser
  onAction: (action: string) => void
}

function UserRow({ user, onAction }: UserRowProps) {
  const getStatusBadge = (user: AdminUser) => {
    if (user.account_status === 'banned') {
      return <Badge variant="destructive">Banned</Badge>
    }
    if (user.account_status === 'suspended') {
      return <Badge variant="destructive">Suspended</Badge>
    }
    if (user.account_status === 'locked' || user.is_locked) {
      return <Badge variant="secondary">Locked</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  const canBan = user.account_status !== 'banned'
  const canLock = !user.is_locked && user.account_status !== 'banned'
  const canSuspend = user.account_status !== 'suspended' && user.account_status !== 'banned'

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="p-3 text-sm">{user.email || 'N/A'}</td>
      <td className="p-3 text-sm">
        <div className="flex items-center gap-2">
          {getStatusBadge(user)}
          {user.role && (
            <span className="text-xs text-muted-foreground capitalize">({user.role})</span>
          )}
        </div>
      </td>
      <td className="p-3 text-sm text-muted-foreground">
        {user.created_at ? formatDate(user.created_at) : 'N/A'}
      </td>
      <td className="p-3 text-sm text-muted-foreground">
        {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
      </td>
      <td className="p-3 text-sm">
        <div className="flex items-center justify-end gap-1">
          {canBan && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction('ban')}
              title="Ban user"
              className="h-8 w-8 p-0"
            >
              <Ban className="h-4 w-4" />
            </Button>
          )}
          {!canBan && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction('unban')}
              title="Unban user"
              className="h-8 w-8 p-0"
            >
              <Unlock className="h-4 w-4" />
            </Button>
          )}
          {canLock && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction('lock')}
              title="Lock account"
              className="h-8 w-8 p-0"
            >
              <Lock className="h-4 w-4" />
            </Button>
          )}
          {!canLock && user.account_status !== 'banned' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction('unlock')}
              title="Unlock account"
              className="h-8 w-8 p-0"
            >
              <Unlock className="h-4 w-4" />
            </Button>
          )}
          {canSuspend && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction('suspend')}
              title="Suspend account"
              className="h-8 w-8 p-0"
            >
              <Shield className="h-4 w-4" />
            </Button>
          )}
          {!canSuspend && user.account_status === 'suspended' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction('unsuspend')}
              title="Unsuspend account"
              className="h-8 w-8 p-0"
            >
              <ShieldOff className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAction('reset_password')}
            title="Reset password"
            className="h-8 w-8 p-0"
          >
            <Key className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAction('force_logout')}
            title="Force logout"
            className="h-8 w-8 p-0"
          >
            <LogOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAction('delete')}
            title="Delete user (permanent)"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}
