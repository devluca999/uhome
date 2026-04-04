import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { NotificationDropdown } from '@/components/ui/notification-dropdown'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { useScrollPosition } from '@/hooks/use-scroll-position'
import { cn } from '@/lib/utils'

export function MobileTopBar({
  homeTo,
  pageTitle,
}: {
  homeTo: string
  pageTitle?: string | null
}) {
  const scrollY = useScrollPosition()
  const showTitle = Boolean(pageTitle && scrollY > 60)

  return (
    <header
      className="glass-nav sticky top-0 z-50 relative overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <GrainOverlay />
      <div className="relative z-10 flex h-14 items-center justify-between px-4">
        <Link
          to={homeTo}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity min-h-[44px] min-w-[44px] relative z-20"
        >
          <img
            src="/logo.png"
            alt="uhome"
            className="h-8 w-8 object-contain flex-shrink-0"
            style={{ imageRendering: 'auto' }}
            onError={e => {
              console.error('Failed to load logo image from /logo.png')
              e.currentTarget.style.display = 'none'
            }}
          />
          <span className="font-semibold text-foreground">uhome</span>
        </Link>
        {pageTitle ? (
          <div
            className={cn(
              'absolute left-1/2 top-1/2 z-10 max-w-[50%] -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center'
            )}
            aria-hidden={!showTitle}
          >
            <p
              className="truncate text-sm font-semibold text-foreground transition-opacity duration-75"
              style={{ opacity: showTitle ? 1 : 0 }}
            >
              {pageTitle}
            </p>
          </div>
        ) : null}
        <div className="flex items-center gap-2 relative z-20">
          <NotificationDropdown />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
