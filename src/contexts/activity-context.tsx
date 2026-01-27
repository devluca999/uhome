import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useActivity, type Activity, type ActivityType } from '@/hooks/use-activity'

interface ActivityContextValue {
  activities: Activity[]
  addActivity: (
    type: ActivityType,
    title: string,
    description?: string,
    metadata?: Record<string, any>,
    expiryDays?: number
  ) => string
  removeActivity: (id: string) => void
  clearAllActivities: () => void
  clearExpiredActivities: () => void
}

const ActivityContext = createContext<ActivityContextValue | undefined>(undefined)

export function ActivityProvider({ children }: { children: ReactNode }) {
  const activity = useActivity()

  return <ActivityContext.Provider value={activity}>{children}</ActivityContext.Provider>
}

export function useActivityContext() {
  const context = useContext(ActivityContext)
  if (context === undefined) {
    throw new Error('useActivityContext must be used within an ActivityProvider')
  }
  return context
}
