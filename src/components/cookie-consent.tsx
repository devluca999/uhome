/**
 * Cookie Consent Banner
 *
 * Shown on first visit. Stores preference in localStorage.
 * Required for GDPR when using non-essential cookies (e.g. analytics).
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'uhome_cookie_consent'

type ConsentStatus = 'accepted' | 'rejected' | null

export function CookieConsent() {
  const [status, setStatus] = useState<ConsentStatus>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ConsentStatus | null
      if (stored === 'accepted' || stored === 'rejected') {
        setStatus(stored)
      } else {
        setStatus(null) // Show banner
      }
    } catch {
      setStatus('accepted') // Default to accepted if localStorage unavailable
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setStatus('accepted')
  }

  const handleReject = () => {
    localStorage.setItem(STORAGE_KEY, 'rejected')
    setStatus('rejected')
  }

  if (status !== null) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 bg-background/95 backdrop-blur border-t border-border shadow-lg"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-muted-foreground flex-1">
          We use essential cookies to operate the app. See our{' '}
          <Link to="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>{' '}
          for details.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleReject}>
            Reject non-essential
          </Button>
          <Button size="sm" onClick={handleAccept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}
