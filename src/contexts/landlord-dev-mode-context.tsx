/**
 * Landlord Dev Mode Context
 *
 * Provides mock landlord data throughout the React app when dev mode is active.
 *
 * Usage:
 * - Wrap app in LandlordDevModeProvider
 * - Hooks check context before making real API calls
 * - If dev mode active, hooks may use mock state for UI-only enhancements
 * - Core data comes from staging database
 */

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { isLandlordDevModeActive } from '@/lib/tenant-dev-mode'
import {
  initializeLandlordState,
  getLandlordState,
  resetLandlordState,
  updateLandlordWorkOrder,
  addLandlordNotification,
  markLandlordNotificationRead,
  markAllLandlordNotificationsRead,
  generateLandlordNotificationForStatusChange,
  type LandlordDevModeState,
  type MockMaintenanceRequest,
  type MockNotification,
} from '@/lib/landlord-mock-state-store'
import type { WorkOrderStatus } from '@/lib/work-order-status'

interface LandlordDevModeContextType {
  isActive: boolean
  state: LandlordDevModeState | null
  updateMockWorkOrder: (id: string, updates: Partial<MockMaintenanceRequest>) => void
  updateMockWorkOrderStatus: (
    id: string,
    status: WorkOrderStatus,
    scheduledDate?: string | null
  ) => void
  addMockNotification: (notification: Omit<MockNotification, 'id' | 'created_at'>) => void
  markMockNotificationRead: (id: string) => void
  markAllMockNotificationsRead: () => void
  resetMockState: () => void
}

const LandlordDevModeContext = createContext<LandlordDevModeContextType | undefined>(undefined)

export function LandlordDevModeProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [state, setState] = useState<LandlordDevModeState | null>(null)
  const location = useLocation()

  // Initialize state when component mounts or URL changes
  useEffect(() => {
    const active = isLandlordDevModeActive()
    setIsActive(active)

    if (active) {
      // Initialize mock state
      const initialState = initializeLandlordState()
      setState(initialState)

      if (import.meta.env.DEV) {
        console.log('[Landlord Dev Mode] Activated with state:', initialState)
      }
    } else {
      // Clear state when dev mode is disabled
      setState(null)
    }
  }, [location.search]) // Re-run when URL search params change

  function updateMockWorkOrder(id: string, updates: Partial<MockMaintenanceRequest>) {
    if (!isActive) return

    const newState = updateLandlordWorkOrder(id, updates)
    setState(newState)
  }

  function updateMockWorkOrderStatus(
    id: string,
    status: WorkOrderStatus,
    scheduledDate?: string | null
  ) {
    if (!isActive || !state) return

    // Get current work order to check old status
    const currentWorkOrder = state.workOrders.find(wo => wo.id === id)
    if (!currentWorkOrder) {
      console.error(`[Landlord Dev Mode] Work order ${id} not found`)
      return
    }

    const oldStatus = currentWorkOrder.status

    // Update work order
    const updates: Partial<MockMaintenanceRequest> = {
      status,
    }

    if (scheduledDate !== undefined) {
      updates.scheduled_date = scheduledDate
    }

    const newState = updateLandlordWorkOrder(id, updates)
    setState(newState)

    // Generate notification for status change
    const updatedWorkOrder = newState.workOrders.find(wo => wo.id === id)
    if (updatedWorkOrder && oldStatus !== status) {
      generateLandlordNotificationForStatusChange(updatedWorkOrder, oldStatus, status)
      // Refresh state to include new notification
      const finalState = getLandlordState()
      if (finalState) {
        setState(finalState)
      }
    }
  }

  function addMockNotification(notification: Omit<MockNotification, 'id' | 'created_at'>) {
    if (!isActive) return

    const newState = addLandlordNotification(notification)
    setState(newState)
  }

  function markMockNotificationRead(id: string) {
    if (!isActive) return

    const newState = markLandlordNotificationRead(id)
    setState(newState)
  }

  function markAllMockNotificationsRead() {
    if (!isActive) return

    const newState = markAllLandlordNotificationsRead()
    setState(newState)
  }

  function resetMockState() {
    if (!isActive) return

    const newState = resetLandlordState()
    setState(newState)

    if (import.meta.env.DEV) {
      console.log('[Landlord Dev Mode] State reset to seed')
    }
  }

  const value = {
    isActive,
    state,
    updateMockWorkOrder,
    updateMockWorkOrderStatus,
    addMockNotification,
    markMockNotificationRead,
    markAllMockNotificationsRead,
    resetMockState,
  }

  return <LandlordDevModeContext.Provider value={value}>{children}</LandlordDevModeContext.Provider>
}

export function useLandlordDevModeContext() {
  const context = useContext(LandlordDevModeContext)
  if (context === undefined) {
    throw new Error('useLandlordDevModeContext must be used within a LandlordDevModeProvider')
  }
  return context
}

/**
 * Hook to check if landlord dev mode is active and get state
 * Returns null if dev mode is not active
 */
export function useLandlordDevMode() {
  const context = useContext(LandlordDevModeContext)
  if (context === undefined) {
    throw new Error('useLandlordDevMode must be used within a LandlordDevModeProvider')
  }

  if (!context.isActive) {
    return null
  }

  return context
}
