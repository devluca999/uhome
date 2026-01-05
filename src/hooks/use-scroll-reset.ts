import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Hook to reset scroll position on route changes
 *
 * Ensures that switching between tabs or routes always resets scroll to top.
 * This prevents random mid-page landings when navigating.
 */
export function useScrollReset() {
  const location = useLocation()

  useEffect(() => {
    // Reset scroll to top on route change
    window.scrollTo(0, 0)
  }, [location.pathname])
}
