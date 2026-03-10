import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AuthContext } from '@/contexts/auth-context'
import { motion, AnimatePresence } from 'framer-motion'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { useReducedMotion } from '@/lib/motion'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { cn } from '@/lib/utils'
import { DraggableDemoSelector } from '@/components/admin/draggable-demo-selector'

const ADMIN_NAV_ITEMS = [
  { path: '/admin/overview', label: 'Overview' },
  { path: '/admin/users', label: 'Users' },
  { path: '/admin/messages-support', label: 'Messages & Support' },
  { path: '/admin/payments', label: 'Payments' },
  { path: '/admin/waitlist', label: 'Waitlist', featureFlag: 'ENABLE_ADMIN_WAITLIST' },
  { path: '/admin/promotions', label: 'Promotions', featureFlag: 'ENABLE_ADMIN_PROMOTIONS' },
  { path: '/admin/newsletter', label: 'Newsletter', featureFlag: 'ENABLE_ADMIN_NEWSLETTER' },
  { path: '/admin/leads', label: 'Leads', featureFlag: 'ENABLE_ADMIN_LEADS' },
  { path: '/admin/performance', label: 'Performance' },
  { path: '/admin/audit-security', label: 'Audit & Security' },
  { path: '/admin/releases', label: 'Releases', featureFlag: 'ENABLE_RELEASE_TRACKING' },
  { path: '/admin/system', label: 'System' },
]

export function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const authContext = useContext(AuthContext)
  const prefersReducedMotion = useReducedMotion()
  const devBypass = import.meta.env.DEV && sessionStorage.getItem('dev_bypass') === 'true'

  if (!authContext) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Authentication error. Please refresh the page.</div>
      </div>
    )
  }

  const { signOut, user } = authContext

  async function handleSignOut() {
    // Clear dev bypass if active
    sessionStorage.removeItem('dev_bypass')
    sessionStorage.removeItem('dev_role')
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background flex">
      <DraggableDemoSelector />
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 sticky top-0 h-screen overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-border">
            <Link
              to="/admin/overview"
              className="flex items-center gap-3 text-xl font-semibold text-foreground hover:opacity-80 transition-opacity"
            >
              <img
                src="/logo.png"
                alt="uhome"
                className="h-8 w-8 object-contain flex-shrink-0"
                style={{ imageRendering: 'auto' }}
                onError={e => {
                  console.error('Failed to load logo image from /logo.png')
                  // Hide image if it fails to load
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div className="flex items-center gap-2">
                <span>uhome</span>
                <Badge variant="secondary" rounded="full" className="lowercase text-xs">
                  admin
                </Badge>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
            {ADMIN_NAV_ITEMS.filter(item => {
              if (item.featureFlag) {
                return isFeatureEnabled(item.featureFlag)
              }
              return true
            }).map((item, index) => (
              <motion.div
                key={item.path}
                initial={{ opacity: motionTokens.opacity.hidden, x: -8 }}
                animate={{ opacity: motionTokens.opacity.visible, x: 0 }}
                transition={{
                  duration: motionTokens.duration.fast,
                  delay: index * 0.03,
                  ease: motionTokens.easing.standard,
                }}
              >
                <Button
                  variant={
                    location.pathname === item.path ||
                    (item.path === '/admin/messages-support' &&
                      (location.pathname === '/admin/conversations' ||
                        location.pathname === '/admin/support'))
                      ? 'default'
                      : 'ghost'
                  }
                  asChild
                  className={cn(
                    'w-full justify-start px-4 py-2 rounded-md transition-all duration-200 whitespace-nowrap',
                    location.pathname === item.path ||
                      (item.path === '/admin/messages-support' &&
                        (location.pathname === '/admin/conversations' ||
                          location.pathname === '/admin/support'))
                      ? 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/20 scale-[1.02] font-medium'
                      : 'bg-transparent hover:bg-muted'
                  )}
                  aria-current={
                    location.pathname === item.path ||
                    (item.path === '/admin/messages-support' &&
                      (location.pathname === '/admin/conversations' ||
                        location.pathname === '/admin/support'))
                      ? 'page'
                      : undefined
                  }
                >
                  <Link to={item.path} className="block truncate">
                    {item.label}
                  </Link>
                </Button>
              </motion.div>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {devBypass ? 'Dev Mode' : user?.email || 'User'}
                </p>
                <Badge variant="secondary" rounded="full" className="text-xs lowercase mt-1">
                  admin
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="flex-1">
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className="flex-1 overscroll-contain"
        style={{
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{
              duration: prefersReducedMotion ? 0 : durationToSeconds(motionTokens.duration.base),
              ease: motionTokens.ease.standard,
            }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
