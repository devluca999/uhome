import { useEffect } from 'react'

/**
 * Hook to lock body scroll when modal is open
 *
 * Prevents background page scrolling while modal is open.
 * Restores scroll on modal close.
 */
export function useModalScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY

      // Lock body scroll
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'

      return () => {
        // Restore scroll position
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])
}
