/**
 * Tenant Dev Mode Context
 *
 * Provides mock tenant data throughout the React app when dev mode is active.
 *
 * Usage:
 * - Wrap app in TenantDevModeProvider
 * - Hooks check context before making real API calls
 * - If dev mode active, hooks return mock data from context
 * - If dev mode inactive, context returns null
 */

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { isTenantDevModeActive } from '@/lib/tenant-dev-mode'
import {
  initializeState,
  getState,
  resetState,
  updateWorkOrder,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  generateNotificationForStatusChange,
  type TenantDevModeState,
  type MockMaintenanceRequest,
  type MockNotification,
} from '@/lib/mock-state-store'
import type { WorkOrderStatus } from '@/lib/work-order-status'

interface TenantDevModeContextType {
  isActive: boolean
  state: TenantDevModeState | null
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

const TenantDevModeContext = createContext<TenantDevModeContextType | undefined>(undefined)

export function TenantDevModeProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [state, setState] = useState<TenantDevModeState | null>(null)
  const location = useLocation()

  // Initialize state when component mounts or URL changes
  useEffect(() => {
    const active = isTenantDevModeActive()
    setIsActive(active)

    if (active) {
      // Initialize mock state
      const initialState = initializeState()
      setState(initialState)

      if (import.meta.env.DEV) {
        console.log('[Tenant Dev Mode] Activated with state:', initialState)
      }
    } else {
      // Clear state when dev mode is disabled
      setState(null)
    }
  }, [location.search]) // Re-run when URL search params change

  function updateMockWorkOrder(id: string, updates: Partial<MockMaintenanceRequest>) {
    if (!isActive) return

    const newState = updateWorkOrder(id, updates)
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
      console.error(`[Tenant Dev Mode] Work order ${id} not found`)
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

    const newState = updateWorkOrder(id, updates)
    setState(newState)

    // Generate notification for status change
    const updatedWorkOrder = newState.workOrders.find(wo => wo.id === id)
    if (updatedWorkOrder && oldStatus !== status) {
      generateNotificationForStatusChange(updatedWorkOrder, oldStatus, status)
      // Refresh state to include new notification
      const finalState = getState()
      if (finalState) {
        setState(finalState)
      }
    }
  }

  function addMockNotification(notification: Omit<MockNotification, 'id' | 'created_at'>) {
    if (!isActive) return

    const newState = addNotification(notification)
    setState(newState)
  }

  function markMockNotificationRead(id: string) {
    if (!isActive) return

    const newState = markNotificationRead(id)
    setState(newState)
  }

  function markAllMockNotificationsRead() {
    if (!isActive) return

    const newState = markAllNotificationsRead()
    setState(newState)
  }

  function resetMockState() {
    if (!isActive) return

    const newState = resetState()
    setState(newState)

    if (import.meta.env.DEV) {
      console.log('[Tenant Dev Mode] State reset to seed')
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

  return <TenantDevModeContext.Provider value={value}>{children}</TenantDevModeContext.Provider>
}

export function useTenantDevModeContext() {
  const context = useContext(TenantDevModeContext)
  if (context === undefined) {
    throw new Error('useTenantDevModeContext must be used within a TenantDevModeProvider')
  }
  return context
}

/**
 * Hook to check if tenant dev mode is active and get state
 * Returns null if dev mode is not active
 */
export function useTenantDevMode() {
  const context = useContext(TenantDevModeContext)
  if (context === undefined) {
    throw new Error('useTenantDevMode must be used within a TenantDevModeProvider')
  }

  if (!context.isActive) {
    return null
  }

  return context
}
