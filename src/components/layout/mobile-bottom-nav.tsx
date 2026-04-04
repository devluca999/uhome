import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { MoreHorizontal } from 'lucide-react'
import { Drawer } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptics'

export type MobileBottomNavItem = { path: string; label: string; icon: LucideIcon }
export type MobileBottomNavMoreItem = { path: string; label: string }

export function MobileBottomNav({
  items,
  moreItems,
}: {
  items: MobileBottomNavItem[]
  moreItems: MobileBottomNavMoreItem[]
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  const primary = items.slice(0, 4)
  const isMoreActive = moreItems.some(m => location.pathname === m.path)

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border"
        style={{
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
        }}
        aria-label="Primary"
      >
        <div className="flex items-stretch justify-around px-1">
          {primary.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path
            return (
              <button
                key={path}
                type="button"
                onClick={() => {
                  haptic.light()
                  navigate(path)
                }}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] px-1 touch-manipulation',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 2} aria-hidden />
                <span className="text-[10px] font-medium leading-tight text-center">{label}</span>
                <span
                  className={cn(
                    'mt-0.5 rounded-full bg-primary shrink-0',
                    active ? 'w-[3px] h-[3px] opacity-100' : 'w-[3px] h-[3px] opacity-0'
                  )}
                  aria-hidden
                />
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => {
              haptic.light()
              setMoreOpen(true)
            }}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] px-1 touch-manipulation',
              isMoreActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
          >
            <MoreHorizontal
              className="h-5 w-5 shrink-0"
              strokeWidth={isMoreActive ? 2.5 : 2}
              aria-hidden
            />
            <span className="text-[10px] font-medium leading-tight">More</span>
            <span
              className={cn(
                'mt-0.5 rounded-full bg-primary shrink-0',
                isMoreActive ? 'w-[3px] h-[3px] opacity-100' : 'w-[3px] h-[3px] opacity-0'
              )}
              aria-hidden
            />
          </button>
        </div>
      </nav>

      <Drawer isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="More" side="bottom">
        <div className="flex flex-col gap-1">
          {moreItems.map(item => (
            <Button
              key={item.path}
              variant="ghost"
              className="w-full justify-start h-12 text-base font-normal"
              onClick={() => {
                haptic.light()
                navigate(item.path)
                setMoreOpen(false)
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </Drawer>
    </>
  )
}
