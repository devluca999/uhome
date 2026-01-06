/**
 * Landlord Dev Mode - Mock State Store
 *
 * Manages mock landlord data with hybrid persistence:
 * 1. Initial seed loaded from database (via seeded demo landlord account)
 * 2. Runtime mutations stored in localStorage (UI-only state)
 * 3. Core data (work orders, properties) uses staging database
 * 4. Can reset to seed state
 *
 * Note: In the extended dev mode, core data comes from staging DB.
 * This store is primarily for UI-only transient state.
 */

import { LANDLORD_DEV_MODE_STORAGE_KEY, LANDLORD_DEV_MODE_VERSION } from './tenant-dev-mode'
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

export interface MockProperty {
  id: string
  owner_id: string
  name: string
  address?: string
  rent_amount: number
  rent_due_date?: number
  rules?: string
}

export interface LandlordDevModeState {
  version: string
  properties: MockProperty[]
  workOrders: MockMaintenanceRequest[]
  notifications: MockNotification[]
  lastUpdated: string
  isDirty: boolean // Has been modified from seed
}

// ============================================================================
// State Management
// ============================================================================

let currentState: LandlordDevModeState | null = null

/**
 * Generate seed data with realistic landlord scenario
 * This is the fallback when localStorage is empty or database seed not available
 * Note: In extended dev mode, actual data comes from staging DB, this is for UI state only
 */
export function generateLandlordSeedState(): LandlordDevModeState {
  const now = new Date()

  // Mock IDs (UUIDs)
  const landlordId = 'mock-user-demo-landlord'
  const property1Id = 'mock-property-sunrise-apt-3b'
  const property2Id = 'mock-property-maple-apt-2a'
  const tenant1Id = 'mock-tenant-1'
  const tenant2Id = 'mock-tenant-2'
  const lease1Id = 'mock-lease-1'
  const lease2Id = 'mock-lease-2'

  const workOrder1Id = 'mock-wo-1'
  const workOrder2Id = 'mock-wo-2'
  const workOrder3Id = 'mock-wo-3'

  return {
    version: LANDLORD_DEV_MODE_VERSION,
    properties: [
      {
        id: property1Id,
        owner_id: landlordId,
        name: 'Sunrise Apartments - Unit 3B',
        address: '1234 Oak Street, Portland, OR 97201',
        rent_amount: 1450,
        rent_due_date: 1,
        rules: 'Water and trash included. Quiet hours 10 PM - 7 AM.',
      },
      {
        id: property2Id,
        owner_id: landlordId,
        name: 'Maple Apartments - Unit 2A',
        address: '5678 Maple Avenue, Portland, OR 97202',
        rent_amount: 1800,
        rent_due_date: 5,
        rules: 'Tenant responsible for utilities. Pet-friendly with deposit.',
      },
    ],
    workOrders: [
      // Work Order 1 - Property 1, tenant-created, submitted
      {
        id: workOrder1Id,
        property_id: property1Id,
        tenant_id: tenant1Id,
        lease_id: lease1Id,
        status: 'submitted',
        category: 'Plumbing',
        description: 'Kitchen sink is leaking underneath. Water pooling in cabinet.',
        public_description: 'Kitchen sink is leaking underneath. Water pooling in cabinet.',
        internal_notes: null,
        scheduled_date: null,
        created_by: tenant1Id,
        created_by_role: 'tenant',
        visibility_to_tenants: true,
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        property: {
          name: 'Sunrise Apartments - Unit 3B',
        },
      },
      // Work Order 2 - Property 2, landlord-created, scheduled
      {
        id: workOrder2Id,
        property_id: property2Id,
        tenant_id: tenant2Id,
        lease_id: lease2Id,
        status: 'scheduled',
        category: 'HVAC',
        description: 'Annual HVAC maintenance scheduled',
        public_description: 'Annual HVAC maintenance scheduled',
        internal_notes: 'Routine maintenance, tenant notified',
        scheduled_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: landlordId,
        created_by_role: 'landlord',
        visibility_to_tenants: true,
        created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        property: {
          name: 'Maple Apartments - Unit 2A',
        },
      },
      // Work Order 3 - Property 1, tenant-created, resolved
      {
        id: workOrder3Id,
        property_id: property1Id,
        tenant_id: tenant1Id,
        lease_id: lease1Id,
        status: 'resolved',
        category: 'Electrical',
        description: 'Living room outlet not working (left wall near window).',
        public_description: 'Living room outlet not working (left wall near window).',
        internal_notes: 'Replaced outlet, circuit breaker tripped',
        scheduled_date: null,
        created_by: tenant1Id,
        created_by_role: 'tenant',
        visibility_to_tenants: true,
        created_at: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        property: {
          name: 'Sunrise Apartments - Unit 3B',
        },
      },
    ],
    notifications: [
      // Notification 1 - Unread (new work order)
      {
        id: 'mock-notif-wo1-created',
        user_id: landlordId,
        type: 'work_order',
        body: 'New work order submitted for Sunrise Apartments - Unit 3B: Kitchen sink is leaking underneath. Water pooling in cabinet.',
        property_id: property1Id,
        work_order_id: workOrder1Id,
        read: false,
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      // Notification 2 - Read (work order update)
      {
        id: 'mock-notif-wo3-resolved',
        user_id: landlordId,
        type: 'work_order',
        body: 'Work order resolved: Living room outlet not working (left wall near window).',
        property_id: property1Id,
        work_order_id: workOrder3Id,
        read: true,
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    lastUpdated: now.toISOString(),
    isDirty: false,
  }
}

/**
 * Load state from localStorage or generate seed
 */
export function loadLandlordState(): LandlordDevModeState {
  try {
    const stored = localStorage.getItem(LANDLORD_DEV_MODE_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as LandlordDevModeState

      // Version check - invalidate if version mismatch
      if (parsed.version !== LANDLORD_DEV_MODE_VERSION) {
        console.warn('[Landlord Dev Mode] Version mismatch, resetting to seed')
        return generateLandlordSeedState()
      }

      return parsed
    }
  } catch (error) {
    console.error('[Landlord Dev Mode] Error loading state from localStorage:', error)
  }

  // No stored state or error - return seed
  return generateLandlordSeedState()
}

/**
 * Persist state to localStorage
 */
export function persistLandlordState(state: LandlordDevModeState): void {
  try {
    const toStore = {
      ...state,
      lastUpdated: new Date().toISOString(),
      isDirty: true,
    }
    localStorage.setItem(LANDLORD_DEV_MODE_STORAGE_KEY, JSON.stringify(toStore))
  } catch (error) {
    console.error('[Landlord Dev Mode] Error persisting state to localStorage:', error)
  }
}

/**
 * Reset state to seed (clear localStorage)
 */
export function resetLandlordState(): LandlordDevModeState {
  try {
    localStorage.removeItem(LANDLORD_DEV_MODE_STORAGE_KEY)
  } catch (error) {
    console.error('[Landlord Dev Mode] Error clearing localStorage:', error)
  }

  const freshState = generateLandlordSeedState()
  currentState = freshState
  return freshState
}

/**
 * Initialize state (load from localStorage or generate seed)
 */
export function initializeLandlordState(): LandlordDevModeState {
  if (currentState) {
    return currentState
  }

  currentState = loadLandlordState()
  return currentState
}

/**
 * Get current state (must call initializeLandlordState first)
 */
export function getLandlordState(): LandlordDevModeState | null {
  return currentState
}

/**
 * Update work order in state
 */
export function updateLandlordWorkOrder(
  id: string,
  updates: Partial<MockMaintenanceRequest>
): LandlordDevModeState {
  if (!currentState) {
    throw new Error('[Landlord Dev Mode] State not initialized')
  }

  const workOrderIndex = currentState.workOrders.findIndex(wo => wo.id === id)
  if (workOrderIndex === -1) {
    throw new Error(`[Landlord Dev Mode] Work order ${id} not found`)
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
  persistLandlordState(newState)

  return newState
}

/**
 * Add notification to state
 */
export function addLandlordNotification(
  notification: Omit<MockNotification, 'id' | 'created_at'>
): LandlordDevModeState {
  if (!currentState) {
    throw new Error('[Landlord Dev Mode] State not initialized')
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
  persistLandlordState(newState)

  return newState
}

/**
 * Mark notification as read
 */
export function markLandlordNotificationRead(id: string): LandlordDevModeState {
  if (!currentState) {
    throw new Error('[Landlord Dev Mode] State not initialized')
  }

  const notificationIndex = currentState.notifications.findIndex(n => n.id === id)
  if (notificationIndex === -1) {
    throw new Error(`[Landlord Dev Mode] Notification ${id} not found`)
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
  persistLandlordState(newState)

  return newState
}

/**
 * Mark all notifications as read
 */
export function markAllLandlordNotificationsRead(): LandlordDevModeState {
  if (!currentState) {
    throw new Error('[Landlord Dev Mode] State not initialized')
  }

  const newState = {
    ...currentState,
    notifications: currentState.notifications.map(n => ({
      ...n,
      read: true,
    })),
  }

  currentState = newState
  persistLandlordState(newState)

  return newState
}

/**
 * Generate notification for work order status change
 * Mimics production notification triggers
 */
export function generateLandlordNotificationForStatusChange(
  workOrder: MockMaintenanceRequest,
  oldStatus: WorkOrderStatus,
  newStatus: WorkOrderStatus
): void {
  if (!currentState) {
    return
  }

  // Only notify landlord for certain transitions
  let notificationBody: string | null = null

  if (workOrder.created_by_role === 'tenant') {
    // Tenant-created work orders
    switch (newStatus) {
      case 'submitted':
        notificationBody = `New work order submitted for ${workOrder.property?.name || 'property'}: ${workOrder.public_description || workOrder.description}`
        break
      case 'resolved':
        notificationBody = `Work order resolved: ${workOrder.public_description || workOrder.description}`
        break
    }
  }

  if (notificationBody) {
    addLandlordNotification({
      user_id: currentState.properties[0]?.owner_id || 'mock-landlord',
      type: 'work_order',
      body: notificationBody,
      property_id: workOrder.property_id,
      work_order_id: workOrder.id,
      read: false,
    })
  }
}
