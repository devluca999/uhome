import { useState, useEffect, useCallback } from 'react'

export type ActivityType =
  | 'tenant_joined'
  | 'work_order_created'
  | 'work_order_updated'
  | 'document_uploaded'
  | 'lease_expiring'
  | 'payment_received'
  | 'expense_added'
  | 'property_added'
  | 'task_completed'

export interface Activity {
  id: string
  type: ActivityType
  title: string
  description?: string
  timestamp: string
  metadata?: Record<string, any>
  expiresAt?: string // ISO date string
}

const STORAGE_KEY = 'uhome_activities'
const DEFAULT_EXPIRY_DAYS = 30

export function useActivity() {
  const [activities, setActivities] = useState<Activity[]>([])

  // Load activities from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Activity[]
        // Filter out expired activities
        const now = new Date().toISOString()
        const valid = parsed.filter(a => !a.expiresAt || new Date(a.expiresAt) > new Date(now))
        setActivities(valid)
        // Update storage if any were filtered
        if (valid.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(valid))
        }
      }
    } catch (error) {
      console.error('Error loading activities:', error)
    }
  }, [])

  // Save activities to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities))
    } catch (error) {
      console.error('Error saving activities:', error)
    }
  }, [activities])

  const addActivity = useCallback(
    (
      type: ActivityType,
      title: string,
      description?: string,
      metadata?: Record<string, any>,
      expiryDays: number = DEFAULT_EXPIRY_DAYS
    ) => {
      const now = new Date()
      const expiresAt = new Date(now)
      expiresAt.setDate(expiresAt.getDate() + expiryDays)

      const activity: Activity = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        description,
        timestamp: now.toISOString(),
        metadata,
        expiresAt: expiresAt.toISOString(),
      }

      setActivities(prev => [activity, ...prev])
      return activity.id
    },
    []
  )

  const removeActivity = useCallback((id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id))
  }, [])

  const clearAllActivities = useCallback(() => {
    setActivities([])
  }, [])

  const clearExpiredActivities = useCallback(() => {
    const now = new Date().toISOString()
    setActivities(prev => prev.filter(a => !a.expiresAt || new Date(a.expiresAt) > new Date(now)))
  }, [])

  // Auto-cleanup expired activities on mount and periodically
  useEffect(() => {
    clearExpiredActivities()
    const interval = setInterval(clearExpiredActivities, 60 * 60 * 1000) // Every hour
    return () => clearInterval(interval)
  }, [clearExpiredActivities])

  return {
    activities,
    addActivity,
    removeActivity,
    clearAllActivities,
    clearExpiredActivities,
  }
}
