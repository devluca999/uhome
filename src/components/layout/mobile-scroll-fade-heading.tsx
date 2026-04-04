import type { ReactNode } from 'react'
import { useScrollPosition } from '@/hooks/use-scroll-position'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { cn } from '@/lib/utils'

const SCROLL_TITLE_THRESHOLD = 60

/**
 * Fades out visible children when scroll passes threshold, in sync with {@link MobileTopBar} title.
 */
export function MobileScrollFadeHeading({
  children,
  className,
  srTitle,
}: {
  children: ReactNode
  className?: string
  /** Document title for assistive tech; should match the route label shown in the top bar when scrolled. */
  srTitle?: string
}) {
  const isMobile = useIsMobile()
  const scrollY = useScrollPosition()

  if (!isMobile) {
    return (
      <>
        {srTitle ? <h1 className="sr-only">{srTitle}</h1> : null}
        <div className={className}>{children}</div>
      </>
    )
  }

  const faded = scrollY > SCROLL_TITLE_THRESHOLD

  return (
    <div
      className={cn('transition-opacity duration-75', className)}
      style={{ opacity: faded ? 0 : 1 }}
    >
      {srTitle ? <h1 className="sr-only">{srTitle}</h1> : null}
      {children}
    </div>
  )
}
