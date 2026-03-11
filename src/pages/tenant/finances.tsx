import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { useTenantData } from '@/hooks/use-tenant-data'
import { useRentRecords } from '@/hooks/use-rent-records'
import { useLeases } from '@/hooks/use-leases'
import { useNotes } from '@/hooks/use-notes'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { Download, FileText, DollarSign, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { motionTokens } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'

/**
 * Tenant Finances Page
 *
 * Read-only view of tenant financial information:
 * - Full payment history
 * - Late fees (read-only)
 * - Receipts download
 * - Notes (read-only)
 *
 * Tenants must never be able to edit financial data.
 */
export function TenantFinances() {
  // Track performance metrics
  usePerformanceTracker({ componentName: 'TenantFinances' })
  const { data: tenantData, loading: tenantLoading } = useTenantData()
  const { leases } = useLeases(undefined, tenantData?.tenant.id)
  // Get first active lease for the tenant (tenants typically have one active lease)
  const activeLease = leases?.find(
    l => !l.lease_end_date || new Date(l.lease_end_date) > new Date()
  )
  const { records: rentRecords, loading: rentLoading } = useRentRecords(activeLease?.id)

  const [clearedRecordIds, setClearedRecordIds] = useState<string[]>([])

  // Calculate summary
  const summary = useMemo(() => {
    const outstanding = rentRecords
      .filter(r => r.status === 'overdue')
      .reduce((sum, r) => sum + Number(r.amount) + ((r as any).late_fee || 0), 0)
    const pending = rentRecords
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + Number(r.amount) + ((r as any).late_fee || 0), 0)
    const paid = rentRecords
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    return { outstanding, pending, paid, total: outstanding + pending }
  }, [rentRecords])

  // Sort records: overdue first, then pending, then paid (most recent first)
  const sortedRecords = useMemo(
    () =>
      [...rentRecords].sort((a, b) => {
        const statusOrder: Record<string, number> = { overdue: 0, pending: 1, paid: 2 }
        const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
        if (statusDiff !== 0) return statusDiff
        return new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
      }),
    [rentRecords]
  )

  const visibleRecords = useMemo(
    () => sortedRecords.filter(record => !clearedRecordIds.includes(record.id)),
    [sortedRecords, clearedRecordIds]
  )

  // Load cleared records from localStorage (per-device, per-browser)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tenant_cleared_rent_records')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setClearedRecordIds(parsed.filter(id => typeof id === 'string'))
        }
      }
    } catch {
      // Ignore storage errors and fall back to empty state
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('tenant_cleared_rent_records', JSON.stringify(clearedRecordIds))
    } catch {
      // Ignore storage errors
    }
  }, [clearedRecordIds])

  if (tenantLoading || rentLoading) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen">
        <GrainOverlay />
        <div className="text-center py-12 relative z-10">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!tenantData) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen">
        <GrainOverlay />
        <EmptyState
          icon={<DollarSign className="h-8 w-8" />}
          title="No financial information available"
          description="Contact your landlord if you have questions about your rent payments."
        />
      </div>
    )
  }

  function handleClearRecord(recordId: string) {
    setClearedRecordIds(prev =>
      prev.includes(recordId) ? prev : [...prev, recordId]
    )
  }

  function handleResetCleared() {
    setClearedRecordIds([])
  }

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />

      <div className="relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">Payment History</h1>
          <p className="text-muted-foreground mt-1">View your rent payment history and receipts</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                ${summary.outstanding.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                ${summary.pending.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                ${summary.paid.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">
                ${summary.total.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <Card className="glass-card">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                {visibleRecords.length} of {sortedRecords.length} payment record
                {sortedRecords.length !== 1 ? 's' : ''} visible
              </CardDescription>
            </div>
            {clearedRecordIds.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleResetCleared}>
                Show cleared payments
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {sortedRecords.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                title="No payment records"
                description="Your payment history will appear here once records are created."
              />
            ) : visibleRecords.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                All payments have been cleared from this view. Use &quot;Show cleared payments&quot; to
                restore them.
              </div>
            ) : (
              <div className="max-h-[60vh] md:max-h-[70vh] overflow-y-auto -mr-2 pr-2">
                <div className="space-y-4 pb-2">
                  {visibleRecords.map(record => (
                    <TenantRentRecordRow
                      key={record.id}
                      record={record}
                      onClear={handleClearRecord}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TenantRentRecordRow({
  record,
  onClear,
}: {
  record: any
  onClear?: (id: string) => void
}) {
  const navigate = useNavigate()
  const { notes } = useNotes('rent_record', record.id)
  const note = notes[0]

  const totalDue = Number(record.amount) + (record.late_fee || 0)
  const hasLateFee = (record.late_fee || 0) > 0
  const canPayOnline =
    isFeatureEnabled('ENABLE_STRIPE_CONNECT') &&
    (record.status === 'pending' || record.status === 'overdue')

  const getStatusBadge = () => {
    switch (record.status) {
      case 'paid':
        return 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30'
      case 'overdue':
        return 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
      case 'pending':
        return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  return (
    <motion.div
      initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      className="border border-border rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-foreground">
              {new Date(record.due_date).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span className={cn('text-xs px-2 py-0.5 rounded border', getStatusBadge())}>
              {record.status}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Due: {new Date(record.due_date).toLocaleDateString()}
            {record.paid_date && ` • Paid: ${new Date(record.paid_date).toLocaleDateString()}`}
          </div>
        </div>
        <div className="text-right">
          <div
            className={cn(
              'font-semibold',
              record.status === 'paid'
                ? 'text-green-600 dark:text-green-400'
                : record.status === 'overdue'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-foreground'
            )}
          >
            ${totalDue.toLocaleString()}
          </div>
          {hasLateFee && (
            <div className="text-xs text-red-600 dark:text-red-400">
              ${Number(record.amount).toLocaleString()} + ${(record.late_fee || 0).toLocaleString()}{' '}
              late fee
            </div>
          )}
        </div>
      </div>

      {/* Payment Method */}
      {record.payment_method_type && (
        <div>
          <span className="text-xs text-muted-foreground">Payment Method: </span>
          <span className="text-sm text-foreground">
            {record.payment_method_label || record.payment_method_type}
          </span>
        </div>
      )}

      {/* Pay Rent Button */}
      {canPayOnline && (
        <div>
          <Button
            onClick={() => navigate(`/tenant/pay-rent/${record.id}`)}
            className="w-full"
            size="sm"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Pay ${totalDue.toLocaleString()}
          </Button>
        </div>
      )}

      {/* Receipt */}
      {record.status === 'paid' && record.receipt_url && (
        <div>
          <a
            href={record.receipt_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Receipt
          </a>
        </div>
      )}

      {/* Notes (read-only) */}
      {note && (
        <div>
          <span className="text-xs text-muted-foreground">Notes: </span>
          <div className="text-sm mt-1">
            <MarkdownRenderer content={note.content} />
          </div>
        </div>
      )}

      {/* Clear (local-only) */}
      {record.status === 'paid' && onClear && (
        <div className="pt-1 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onClear(record.id)}
          >
            Clear from history
          </Button>
        </div>
      )}
    </motion.div>
  )
}
