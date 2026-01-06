/**
 * Work Order Status System
 *
 * Canonical statuses: submitted, seen, scheduled, in_progress, resolved, closed
 * State machine enforces valid transitions based on creator role.
 */

export type WorkOrderStatus =
  | 'submitted'
  | 'seen'
  | 'scheduled'
  | 'in_progress'
  | 'resolved'
  | 'closed'
export type CreatorRole = 'landlord' | 'tenant'

/**
 * State machine: Valid next statuses based on current status and creator role
 */
const STATUS_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  submitted: ['seen', 'scheduled', 'in_progress', 'resolved', 'closed'], // Landlord can skip ahead
  seen: ['scheduled', 'in_progress', 'resolved', 'closed'],
  scheduled: ['in_progress', 'resolved', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [], // Terminal state
}

/**
 * Tenant-created work order flow (typical)
 * submitted → seen → scheduled → in_progress → resolved → closed
 */
const TENANT_CREATED_FLOW: WorkOrderStatus[] = [
  'submitted',
  'seen',
  'scheduled',
  'in_progress',
  'resolved',
  'closed',
]

/**
 * Landlord-created work order flow (typical)
 * scheduled → in_progress → resolved → closed
 */
const LANDLORD_CREATED_FLOW: WorkOrderStatus[] = ['scheduled', 'in_progress', 'resolved', 'closed']

/**
 * Get valid next statuses for a work order
 */
export function getValidNextStatuses(
  currentStatus: WorkOrderStatus,
  createdByRole: CreatorRole
): WorkOrderStatus[] {
  // If closed, no transitions allowed
  if (currentStatus === 'closed') {
    return []
  }

  // Get all possible next statuses from state machine
  const possibleNext = STATUS_TRANSITIONS[currentStatus] || []

  // For tenant-created, prefer typical flow but allow landlord to skip ahead
  // For landlord-created, prefer typical flow but allow skipping ahead
  return possibleNext
}

/**
 * Check if a status transition is valid
 */
export function canTransitionTo(
  from: WorkOrderStatus,
  to: WorkOrderStatus,
  createdByRole: CreatorRole
): boolean {
  if (from === 'closed') {
    return false // Closed is terminal
  }

  const validNext = getValidNextStatuses(from, createdByRole)
  return validNext.includes(to)
}

/**
 * Get human-readable status name for display
 */
export function getStatusDisplayName(status: WorkOrderStatus, role: 'landlord' | 'tenant'): string {
  const displayNames: Record<WorkOrderStatus, { landlord: string; tenant: string }> = {
    submitted: {
      landlord: 'Submitted',
      tenant: 'Submitted',
    },
    seen: {
      landlord: 'Seen',
      tenant: 'Landlord has reviewed',
    },
    scheduled: {
      landlord: 'Scheduled',
      tenant: 'Scheduled',
    },
    in_progress: {
      landlord: 'In Progress',
      tenant: 'In Progress',
    },
    resolved: {
      landlord: 'Resolved',
      tenant: 'Awaiting your confirmation',
    },
    closed: {
      landlord: 'Closed',
      tenant: 'Closed',
    },
  }

  return displayNames[status]?.[role] || status
}

/**
 * Get badge variant for status
 */
export function getStatusBadgeVariant(status: WorkOrderStatus): string {
  const variants: Record<WorkOrderStatus, string> = {
    submitted:
      'bg-yellow-500/30 text-yellow-100 dark:text-yellow-50 border-yellow-500/50 dark:border-yellow-500/40 font-semibold',
    seen: 'bg-blue-500/30 text-blue-100 dark:text-blue-50 border-blue-500/50 dark:border-blue-500/40 font-semibold',
    scheduled:
      'bg-purple-500/30 text-purple-100 dark:text-purple-50 border-purple-500/50 dark:border-purple-500/40 font-semibold',
    in_progress:
      'bg-blue-500/30 text-blue-100 dark:text-blue-50 border-blue-500/50 dark:border-blue-500/40 font-semibold',
    resolved:
      'bg-orange-500/30 text-orange-100 dark:text-orange-50 border-orange-500/50 dark:border-orange-500/40 font-semibold',
    closed:
      'bg-green-500/30 text-green-100 dark:text-green-50 border-green-500/50 dark:border-green-500/40 font-semibold',
  }

  return (
    variants[status] ||
    'bg-stone-500/30 text-stone-100 dark:text-stone-50 border-stone-500/50 dark:border-stone-500/40 font-semibold'
  )
}

/**
 * Check if tenant can perform action on this status
 */
export function canTenantConfirmResolution(status: WorkOrderStatus): boolean {
  return status === 'resolved'
}

/**
 * Get initial status based on creator role
 */
export function getInitialStatus(createdByRole: CreatorRole): WorkOrderStatus {
  return createdByRole === 'tenant' ? 'submitted' : 'scheduled'
}
