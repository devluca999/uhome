import { type RefObject, useEffect } from 'react'
import { useIsMobile } from '@/hooks/use-is-mobile'

const EDGE_PX = 24
const SWIPE_MIN_DX = 88

/**
 * Edge swipe from the left (finger moving right) calls `history.back()` on mobile.
 * Listeners attach to the scrollable `main` ref to avoid clashing with the header/nav.
 */
export function useSwipeToGoBack(mainRef: RefObject<HTMLElement | null>) {
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!isMobile) return
    const el = mainRef.current
    if (!el) return

    let startX = 0
    let startY = 0
    let fromEdge = false

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      fromEdge = t.clientX <= EDGE_PX
      startX = t.clientX
      startY = t.clientY
    }

    const onEnd = (e: TouchEvent) => {
      if (!fromEdge) return
      const t = e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - startX
      const dy = Math.abs(t.clientY - startY)
      fromEdge = false
      if (dx < SWIPE_MIN_DX) return
      if (dy > Math.abs(dx) * 0.75) return
      if (window.history.length <= 1) return
      window.history.back()
    }

    const onCancel = () => {
      fromEdge = false
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onCancel, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onCancel)
    }
  }, [isMobile, mainRef])
}
