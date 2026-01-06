/**
 * Tenant Dev Mode - Mock State Store
 *
 * Manages mock tenant data with hybrid persistence:
 * 1. Initial seed loaded from database (via seeded demo tenant account)
 * 2. Runtime mutations stored in localStorage
 * 3. State persists across page refreshes
 * 4. Can reset to seed state
 *
 * This ensures:
 * - Realistic data that flows through production hooks
 * - Mutations persist for demos and testing
 * - E2E tests can reset to known state
 */

import { TENANT_DEV_MODE_STORAGE_KEY, TENANT_DEV_MODE_VERSION } from './tenant-dev-mode'
import type { WorkOrderStatus, CreatorRole } from './work-order-status'

// ============================================================================
// Types
// ============================================================================

export interface MockMaintenanceRequest {
  id: string
  property_id: string
  tenant_id: string | null
  lease_id: string | null
  status: WorkOrderStatus
  category?: string
  description: string
  public_description?: string | null
  internal_notes?: string | null
  scheduled_date?: string | null
  created_by: string
  created_by_role: CreatorRole
  visibility_to_tenants: boolean
  created_at: string
  updated_at: string
  property?: {
    name: string
  }
  tenant?: {
    user?: {
      email: string
    }
  }
}

export interface MockNotification {
  id: string
  user_id: string
  type: string
  body: string
  property_id?: string | null
  work_order_id?: string | null
  read: boolean
  created_at: string
}

export interface MockTenantData {
  tenant: {
    id: string
    property_id: string
    move_in_date: string
    lease_end_date?: string
  }
  property: {
    id: string
    name: string
    address?: string
    rent_amount: number
    rent_due_date?: number
    rules?: string
  }
  leases?: Array<{
    id: string
    property_id: string
    tenant_id: string
    lease_start_date: string
    lease_end_date: string | null
    lease_type: 'short-term' | 'long-term'
    rent_amount: number
    rent_frequency: 'monthly' | 'weekly' | 'biweekly' | 'yearly'
    security_deposit: number | null
  }>
}

export interface TenantDevModeState {
  version: string
  tenantData: MockTenantData
  workOrders: MockMaintenanceRequest[]
  notifications: MockNotification[]
  lastUpdated: string
  isDirty: boolean // Has been modified from seed
}

// ============================================================================
// State Management
// ============================================================================

let currentState: TenantDevModeState | null = null

/**
 * Generate seed data with realistic mock scenario
 * This is the fallback when localStorage is empty or database seed not available
 */
export function generateSeedState(): TenantDevModeState {
  const now = new Date()
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
  const sixMonthsFromNow = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)

  // Mock IDs (UUIDs)
  const propertyId = 'mock-property-sunrise-apt-3b'
  const tenantId = 'mock-tenant-demo-user'
  const leaseId = 'mock-lease-active'
  const userId = 'mock-user-demo-tenant'

  const workOrder1Id = 'mock-wo-plumbing-submitted'
  const workOrder2Id = 'mock-wo-hvac-scheduled'
  const workOrder3Id = 'mock-wo-electrical-resolved'

  return {
    version: TENANT_DEV_MODE_VERSION,
    tenantData: {
      tenant: {
        id: tenantId,
        property_id: propertyId,
        move_in_date: sixMonthsAgo.toISOString(),
        lease_end_date: sixMonthsFromNow.toISOString(),
      },
      property: {
        id: propertyId,
        name: 'Sunrise Apartments - Unit 3B',
        address: '1234 Oak Street, Portland, OR 97201',
        rent_amount: 1450,
        rent_due_date: 1,
        rules: 'Water and trash included. Quiet hours 10 PM - 7 AM.',
      },
      leases: [
        {
          id: leaseId,
          property_id: propertyId,
          tenant_id: tenantId,
          lease_start_date: sixMonthsAgo.toISOString(),
          lease_end_date: sixMonthsFromNow.toISOString(),
          lease_type: 'long-term',
          rent_amount: 1450,
          rent_frequency: 'monthly',
          security_deposit: 1450,
        },
      ],
    },
    workOrders: [
      // Work Order 1 - Submitted (tenant created, awaiting landlord review)
      {
        id: workOrder1Id,
        property_id: propertyId,
        tenant_id: tenantId,
        lease_id: leaseId,
        status: 'submitted',
        category: 'Plumbing',
        description: 'Kitchen sink is leaking underneath. Water pooling in cabinet.',
        public_description: 'Kitchen sink is leaking underneath. Water pooling in cabinet.',
        internal_notes: null,
        scheduled_date: null,
        created_by: userId,
        created_by_role: 'tenant',
        visibility_to_tenants: true,
        created_at: twoDaysAgo.toISOString(),
        updated_at: twoDaysAgo.toISOString(),
        property: {
          name: 'Sunrise Apartments - Unit 3B',
        },
      },
      // Work Order 2 - Scheduled (tenant created, landlord scheduled maintenance)
      {
        id: workOrder2Id,
        property_id: propertyId,
        tenant_id: tenantId,
        lease_id: leaseId,
        status: 'scheduled',
        category: 'HVAC',
        description: 'Heating not working properly. Temperature drops below 65°F at night.',
        public_description: 'Heating not working properly. Temperature drops below 65°F at night.',
        internal_notes: 'Scheduled HVAC technician visit',
        scheduled_date: threeDaysFromNow.toISOString(),
        created_by: userId,
        created_by_role: 'tenant',
        visibility_to_tenants: true,
        created_at: oneWeekAgo.toISOString(),
        updated_at: oneWeekAgo.toISOString(),
        property: {
          name: 'Sunrise Apartments - Unit 3B',
        },
      },
      // Work Order 3 - Resolved (tenant created, completed by landlord, awaiting tenant confirmation)
      {
        id: workOrder3Id,
        property_id: propertyId,
        tenant_id: tenantId,
        lease_id: leaseId,
        status: 'resolved',
        category: 'Electrical',
        description: 'Living room outlet not working (left wall near window).',
        public_description: 'Living room outlet not working (left wall near window).',
        internal_notes: 'Replaced outlet, circuit breaker tripped',
        scheduled_date: null,
        created_by: userId,
        created_by_role: 'tenant',
        visibility_to_tenants: true,
        created_at: threeWeeksAgo.toISOString(),
        updated_at: twoDaysAgo.toISOString(),
        property: {
          name: 'Sunrise Apartments - Unit 3B',
        },
      },
    ],
    notifications: [
      // Notification 1 - Unread (work order 2 scheduled)
      {
        id: 'mock-notif-wo2-scheduled',
        user_id: userId,
        type: 'work_order',
        body: 'Maintenance has been scheduled for: Heating not working properly. Temperature drops below 65°F at night.',
        property_id: propertyId,
        work_order_id: workOrder2Id,
        read: false,
        created_at: oneWeekAgo.toISOString(),
      },
      // Notification 2 - Read (work order 3 resolved)
      {
        id: 'mock-notif-wo3-resolved',
        user_id: userId,
        type: 'work_order',
        body: 'Work order has been resolved. Please confirm if the issue is fixed: Living room outlet not working (left wall near window).',
        property_id: propertyId,
        work_order_id: workOrder3Id,
        read: true,
        created_at: twoDaysAgo.toISOString(),
      },
      // Notification 3 - Unread (work order 1 seen by landlord)
      {
        id: 'mock-notif-wo1-seen',
        user_id: userId,
        type: 'work_order',
        body: 'Your landlord has reviewed your work order: Kitchen sink is leaking underneath. Water pooling in cabinet.',
        property_id: propertyId,
        work_order_id: workOrder1Id,
        read: false,
        created_at: oneDayAgo.toISOString(),
      },
    ],
    lastUpdated: now.toISOString(),
    isDirty: false,
  }
}

/**
 * Load state from localStorage or generate seed
 */
export function loadState(): TenantDevModeState {
  try {
    const stored = localStorage.getItem(TENANT_DEV_MODE_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as TenantDevModeState

      // Version check - invalidate if version mismatch
      if (parsed.version !== TENANT_DEV_MODE_VERSION) {
        console.warn('[Tenant Dev Mode] Version mismatch, resetting to seed')
        return generateSeedState()
      }

      return parsed
    }
  } catch (error) {
    console.error('[Tenant Dev Mode] Error loading state from localStorage:', error)
  }

  // No stored state or error - return seed
  return generateSeedState()
}

/**
 * Persist state to localStorage
 */
export function persistState(state: TenantDevModeState): void {
  try {
    const toStore = {
      ...state,
      lastUpdated: new Date().toISOString(),
      isDirty: true,
    }
    localStorage.setItem(TENANT_DEV_MODE_STORAGE_KEY, JSON.stringify(toStore))
  } catch (error) {
    console.error('[Tenant Dev Mode] Error persisting state to localStorage:', error)
  }
}

/**
 * Reset state to seed (clear localStorage)
 */
export function resetState(): TenantDevModeState {
  try {
    localStorage.removeItem(TENANT_DEV_MODE_STORAGE_KEY)
  } catch (error) {
    console.error('[Tenant Dev Mode] Error clearing localStorage:', error)
  }

  const freshState = generateSeedState()
  currentState = freshState
  return freshState
}

/**
 * Initialize state (load from localStorage or generate seed)
 */
export function initializeState(): TenantDevModeState {
  if (currentState) {
    return currentState
  }

  currentState = loadState()
  return currentState
}

/**
 * Get current state (must call initializeState first)
 */
export function getState(): TenantDevModeState | null {
  return currentState
}

/**
 * Update work order in state
 */
export function updateWorkOrder(
  id: string,
  updates: Partial<MockMaintenanceRequest>
): TenantDevModeState {
  if (!currentState) {
    throw new Error('[Tenant Dev Mode] State not initialized')
  }

  const workOrderIndex = currentState.workOrders.findIndex(wo => wo.id === id)
  if (workOrderIndex === -1) {
    throw new Error(`[Tenant Dev Mode] Work order ${id} not found`)
  }

  const updatedWorkOrder = {
    ...currentState.workOrders[workOrderIndex],
    ...updates,
    updated_at: new Date().toISOString(),
  }

  const newState = {
    ...currentState,
    workOrders: [
      ...currentState.workOrders.slice(0, workOrderIndex),
      updatedWorkOrder,
      ...currentState.workOrders.slice(workOrderIndex + 1),
    ],
  }

  currentState = newState
  persistState(newState)

  return newState
}

/**
 * Add notification to state
 */
export function addNotification(
  notification: Omit<MockNotification, 'id' | 'created_at'>
): TenantDevModeState {
  if (!currentState) {
    throw new Error('[Tenant Dev Mode] State not initialized')
  }

  const newNotification: MockNotification = {
    ...notification,
    id: `mock-notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
  }

  const newState = {
    ...currentState,
    notifications: [newNotification, ...currentState.notifications],
  }

  currentState = newState
  persistState(newState)

  return newState
}

/**
 * Mark notification as read
 */
export function markNotificationRead(id: string): TenantDevModeState {
  if (!currentState) {
    throw new Error('[Tenant Dev Mode] State not initialized')
  }

  const notificationIndex = currentState.notifications.findIndex(n => n.id === id)
  if (notificationIndex === -1) {
    throw new Error(`[Tenant Dev Mode] Notification ${id} not found`)
  }

  const updatedNotification = {
    ...currentState.notifications[notificationIndex],
    read: true,
  }

  const newState = {
    ...currentState,
    notifications: [
      ...currentState.notifications.slice(0, notificationIndex),
      updatedNotification,
      ...currentState.notifications.slice(notificationIndex + 1),
    ],
  }

  currentState = newState
  persistState(newState)

  return newState
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsRead(): TenantDevModeState {
  if (!currentState) {
    throw new Error('[Tenant Dev Mode] State not initialized')
  }

  const newState = {
    ...currentState,
    notifications: currentState.notifications.map(n => ({
      ...n,
      read: true,
    })),
  }

  currentState = newState
  persistState(newState)

  return newState
}

/**
 * Generate notification for work order status change
 * Mimics production notification triggers
 */
export function generateNotificationForStatusChange(
  workOrder: MockMaintenanceRequest,
  oldStatus: WorkOrderStatus,
  newStatus: WorkOrderStatus
): void {
  if (!currentState) {
    return
  }

  // Only notify tenant for certain transitions (mimics production trigger logic)
  let notificationBody: string | null = null

  if (workOrder.created_by_role === 'tenant') {
    // Tenant-created work orders
    switch (newStatus) {
      case 'seen':
        notificationBody = `Your landlord has reviewed your work order: ${workOrder.public_description || workOrder.description}`
        break
      case 'scheduled':
        notificationBody = `Maintenance has been scheduled for: ${workOrder.public_description || workOrder.description}`
        break
      case 'resolved':
        notificationBody = `Work order has been resolved. Please confirm if the issue is fixed: ${workOrder.public_description || workOrder.description}`
        break
      case 'closed':
        notificationBody = `Work order has been closed: ${workOrder.public_description || workOrder.description}`
        break
    }
  }

  if (notificationBody) {
    addNotification({
      user_id: workOrder.created_by,
      type: 'work_order',
      body: notificationBody,
      property_id: workOrder.property_id,
      work_order_id: workOrder.id,
      read: false,
    })
  }
}
