import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { NotificationDropdown } from '@/components/ui/notification-dropdown'
import { GrainOverlay } from '@/components/ui/grain-overlay'

export function MobileTopBar({ homeTo }: { homeTo: string }) {
  return (
    <header className="glass-nav sticky top-0 z-50 h-14 relative overflow-hidden">
      <GrainOverlay />
      <div className="relative z-10 flex h-full items-center justify-between px-4">
        <Link
          to={homeTo}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity min-h-[44px] min-w-[44px]"
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
        <div className="flex items-center gap-2">
          <NotificationDropdown />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
