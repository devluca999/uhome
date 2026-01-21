/**
 * Performance Tracker Hook
 *
 * React hook for tracking performance metrics in components.
 * Automatically tracks page loads and can be used to track component renders.
 */

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { performanceTracker } from '@/lib/performance/performance-tracker'

interface UsePerformanceTrackerOptions {
  componentName?: string
  trackComponentRender?: boolean
}

/**
 * Hook to track page load and component render performance
 */
export function usePerformanceTracker(options: UsePerformanceTrackerOptions = {}) {
  const location = useLocation()
  const pageLoadStartTime = useRef<number>(Date.now())
  const renderStartTime = useRef<number>(Date.now())
  const { componentName, trackComponentRender = false } = options

  // Track page load on route change
  useEffect(() => {
    const startTime = Date.now()
    pageLoadStartTime.current = startTime

    // Track when page is fully loaded
    const handleLoad = () => {
      const duration = Date.now() - startTime
      performanceTracker.trackPageLoad(location.pathname, duration, {
        route: location.pathname,
        search: location.search,
      })
    }

    // If page is already loaded
    if (document.readyState === 'complete') {
      handleLoad()
    } else {
      window.addEventListener('load', handleLoad)
      return () => window.removeEventListener('load', handleLoad)
    }
  }, [location.pathname, location.search])

  // Track component render time
  useEffect(() => {
    if (!trackComponentRender || !componentName) return

    const startTime = Date.now()
    renderStartTime.current = startTime

    return () => {
      const duration = Date.now() - startTime
      performanceTracker.trackComponentRender(componentName, duration, {
        path: location.pathname,
      })
    }
  }, [componentName, trackComponentRender, location.pathname])

  return {
    trackAPICall: performanceTracker.trackAPICall.bind(performanceTracker),
    trackComponentRender: performanceTracker.trackComponentRender.bind(performanceTracker),
  }
}
