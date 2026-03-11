import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { PropertyForm } from '@/components/landlord/property-form'
import { PropertyRulesEditor } from '@/components/landlord/property-rules-editor'
import { TenantInviteForm } from '@/components/landlord/tenant-invite-form'
import { PropertyDocuments } from '@/components/landlord/property-documents'
import { WorkOrderForm } from '@/components/landlord/work-order-form'
import { PaymentSettingsForm } from '@/components/landlord/payment-settings-form'
import { ConnectOnboarding } from '@/components/billing/connect-onboarding'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useTenants } from '@/hooks/use-tenants'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import { useProperties } from '@/hooks/use-properties'
import { useExpenses } from '@/hooks/use-expenses'
// import { useLeases } from '@/hooks/use-leases' // Unused
import { OnboardingTemplateEditor } from '@/components/landlord/onboarding-template-editor'
import { ArrowLeft, Plus, Users, Wrench, Calendar, User, Trash2, MessageSquare } from 'lucide-react'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { useNavigate } from 'react-router-dom'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { navigateToTenantMessaging } from '@/lib/messaging-helpers'
import type { Database } from '@/types/database'
import { cn } from '@/lib/utils'
import { Button as UiButton } from '@/components/ui/button'
import { useCurrencyFormatter } from '@/hooks/use-currency-formatter'
import { ExpenseForm } from '@/components/landlord/expense-form'

type Property = Database['public']['Tables']['properties']['Row'] & {
  is_active?: boolean // Optional in case migration hasn't been run
  late_fee_rules?: {
    amount?: number
    grace_period_days?: number
    applies_after?: 'due_date' | 'grace_period_end'
  } | null
}

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { updateProperty } = useProperties()
  const { tenants, unlinkTenant: unlinkTenantFromHook } = useTenants()
  const { requests: workOrders, refetch: refetchWorkOrders } = useMaintenanceRequests(id, true) // true = isPropertyId
  const {
    expenses,
    loading: expensesLoading,
    createExpense,
    updateExpense,
    deleteExpense,
    markExpensePaid,
    getNextDueDate,
  } = useExpenses(id)
  // const { leases } = useLeases(id) // Unused
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [showWorkOrderForm, setShowWorkOrderForm] = useState(false)
  const [tenantView, setTenantView] = useState<'active' | 'all'>('active')
  const messagingEnabled = isFeatureEnabled('ENABLE_MESSAGING_ENTRY_POINTS')
  const { format: formatCurrency } = useCurrencyFormatter()
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchProperty()
    }
  }, [id])

  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true })
  }, [activeTab, setSearchParams])

  async function fetchProperty() {
    if (!id) return

    try {
      setLoading(true)
      const { data, error } = await supabase.from('properties').select('*').eq('id', id).single()

      if (error) throw error
      // Ensure is_active defaults to true if not set (for backward compatibility)
      // Handle case where is_active column might not exist yet (migration not run)
      const isActive = data.is_active !== undefined ? data.is_active !== false : true
      setProperty({ ...data, is_active: isActive })
    } catch (error) {
      console.error('Error fetching property:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(data: {
    name: string
    address?: string
    rent_amount: number
    rent_due_date?: number
    rules?: string
    property_type?: string | null
    group_ids?: string[]
  }) {
    if (!id) return

    setSubmitting(true)
    try {
      await updateProperty(id, data)
      await fetchProperty()
      setEditing(false)
    } catch (error) {
      console.error('Error updating property:', error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveRules(rules: string | null, visibleToTenants: boolean) {
    if (!id) return
    await updateProperty(id, {
      rules: rules || null,
      rules_visible_to_tenants: visibleToTenants,
    })
    await fetchProperty()
  }

  async function handleUnlinkTenant(tenantId: string) {
    if (
      !confirm(
        'Are you sure you want to remove this tenant from the property? The tenant record will be preserved.'
      )
    ) {
      return
    }

    try {
      await unlinkTenantFromHook(tenantId)
    } catch (error) {
      console.error('Error unlinking tenant:', error)
      alert('Failed to remove tenant. Please try again.')
    }
  }

  // Filter tenants for this property
  const propertyTenants = useMemo(() => {
    if (!id) return []
    return tenants.filter(t => t.property_id === id)
  }, [tenants, id])

  // Filter active vs all tenants
  const displayedTenants = useMemo(() => {
    if (tenantView === 'active') {
      return propertyTenants.filter(t => {
        if (!t.lease_end_date) return true
        return new Date(t.lease_end_date) > new Date()
      })
    }
    return propertyTenants
  }, [propertyTenants, tenantView])

  // Work order counts
  const workOrderCounts = useMemo(() => {
    return {
      submitted: workOrders.filter(r => r.status === 'submitted').length,
      seen: workOrders.filter(r => r.status === 'seen').length,
      scheduled: workOrders.filter(r => r.status === 'scheduled').length,
      in_progress: workOrders.filter(r => r.status === 'in_progress').length,
      resolved: workOrders.filter(r => r.status === 'resolved').length,
      closed: workOrders.filter(r => r.status === 'closed').length,
    }
  }, [workOrders])

  if (loading) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 relative">
        <GrainOverlay />
        <div className="relative z-10 text-center py-12">
          <p className="text-muted-foreground">Loading property...</p>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 relative">
        <GrainOverlay />
        <div className="relative z-10 text-center py-12">
          <p className="text-muted-foreground mb-4">Property not found</p>
          <Button asChild variant="outline">
            <Link to="/landlord/properties">Back to Properties</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 max-w-2xl relative">
        <GrainOverlay />
        <div className="relative z-10">
          <Button variant="ghost" onClick={() => setEditing(false)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <PropertyForm
            property={property}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
            loading={submitting}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-0.5 pb-8 max-w-6xl relative">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        {/* Persistent Header */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/landlord/properties">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Properties
            </Link>
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">{property.name}</h1>
              {property.address && <p className="text-muted-foreground mt-1">{property.address}</p>}
              <div className="flex items-center gap-2 mt-2">
                {property.property_type && (
                  <Badge variant="outline">{property.property_type}</Badge>
                )}
              </div>
            </div>
            <Button onClick={() => setEditing(true)}>Edit Property</Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              {/* Property Status Toggle */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Property Status</CardTitle>
                  <CardDescription>
                    {property.is_active === true || property.is_active === undefined
                      ? 'Property is included in calculations and metrics'
                      : 'Property is excluded from calculations and metrics'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          property.is_active === true || property.is_active === undefined
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`}
                        title={
                          property.is_active === true || property.is_active === undefined
                            ? 'Active'
                            : 'Inactive'
                        }
                      />
                      <div>
                        <p className="font-medium text-foreground">
                          {property.is_active === true || property.is_active === undefined
                            ? 'Active'
                            : 'Inactive'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {property.is_active === true || property.is_active === undefined
                            ? 'Included in all calculations'
                            : 'Excluded from all calculations'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={property.is_active === true || property.is_active === undefined}
                      onCheckedChange={async checked => {
                        setSubmitting(true)
                        try {
                          const { error } = await supabase
                            .from('properties')
                            .update({ is_active: checked })
                            .eq('id', property.id)
                          if (error) throw error
                          // Update local state
                          setProperty({ ...property, is_active: checked })
                        } catch (err) {
                          console.error('Error updating property status:', err)
                          alert('Failed to update property status')
                        } finally {
                          setSubmitting(false)
                        }
                      }}
                      disabled={submitting}
                      aria-label={
                        property.is_active === true || property.is_active === undefined
                          ? 'Mark property inactive'
                          : 'Mark property active'
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Rent Information */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Rent Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Monthly Rent</span>
                    <span className="text-xl font-semibold text-foreground">
                      ${property.rent_amount.toLocaleString()}
                    </span>
                  </div>
                  {property.rent_due_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Due Date</span>
                      <span className="font-medium text-foreground">
                        {property.rent_due_date}
                        {property.rent_due_date === 1
                          ? 'st'
                          : property.rent_due_date === 2
                            ? 'nd'
                            : property.rent_due_date === 3
                              ? 'rd'
                              : 'th'}{' '}
                        of month
                      </span>
                    </div>
                  )}
                  {property.late_fee_rules && (
                    <div className="pt-2 border-t border-border">
                      <span className="text-sm text-muted-foreground">Late Fee Rules</span>
                      <div className="mt-2 space-y-1 text-sm">
                        {property.late_fee_rules.amount && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-medium">${property.late_fee_rules.amount}</span>
                          </div>
                        )}
                        {property.late_fee_rules.grace_period_days && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Grace Period:</span>
                            <span className="font-medium">
                              {property.late_fee_rules.grace_period_days} days
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Occupancy Summary */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Occupancy Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-2xl font-semibold text-foreground">
                        {propertyTenants.length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {propertyTenants.length === 1 ? 'Tenant' : 'Tenants'}
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTab('tenants')}>
                      View Tenants
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Work Order Summary */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Work Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-foreground">
                        {workOrderCounts.submitted}
                      </div>
                      <div className="text-xs text-muted-foreground">Submitted</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-foreground">
                        {workOrderCounts.in_progress}
                      </div>
                      <div className="text-xs text-muted-foreground">In Progress</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-foreground">
                        {workOrderCounts.closed}
                      </div>
                      <div className="text-xs text-muted-foreground">Closed</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setActiveTab('work-orders')}
                  >
                    View Work Orders
                  </Button>
                </CardContent>
              </Card>

              {/* Upcoming Expenses */}
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>Upcoming Expenses</CardTitle>
                    <CardDescription>Next scheduled expenses for this property.</CardDescription>
                  </div>
                  <UiButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (expenses.length === 0) {
                        setEditingExpenseId(null)
                        setShowExpenseModal(true)
                      } else {
                        setActiveTab('expenses')
                      }
                    }}
                  >
                    View all expenses →
                  </UiButton>
                </CardHeader>
                <CardContent>
                  {expensesLoading ? (
                    <p className="text-sm text-muted-foreground">Loading expenses…</p>
                  ) : expenses.length === 0 ? (
                    <div className="flex flex-col items-start gap-3">
                      <p className="text-sm text-muted-foreground">No upcoming expenses yet.</p>
                      <UiButton
                        size="sm"
                        onClick={() => {
                          setEditingExpenseId(null)
                          setShowExpenseModal(true)
                        }}
                      >
                        Add Expense
                      </UiButton>
                    </div>
                  ) : (
                    (() => {
                      const todayStr = new Date().toISOString().split('T')[0]
                      const upcoming = expenses
                        .map(e => ({
                          expense: e,
                          nextDue: getNextDueDate(e),
                        }))
                        .filter(item => item.nextDue >= todayStr)
                        .sort((a, b) =>
                          a.nextDue < b.nextDue ? -1 : a.nextDue > b.nextDue ? 1 : 0
                        )
                        .slice(0, 5)

                      if (upcoming.length === 0) {
                        return (
                          <div className="flex flex-col items-start gap-3">
                            <p className="text-sm text-muted-foreground">
                              No upcoming expenses yet.
                            </p>
                            <UiButton
                              size="sm"
                              onClick={() => {
                                setEditingExpenseId(null)
                                setShowExpenseModal(true)
                              }}
                            >
                              Add Expense
                            </UiButton>
                          </div>
                        )
                      }

                      return (
                        <div className="space-y-2">
                          {upcoming.map(({ expense, nextDue }) => (
                            <div
                              key={expense.id}
                              className="flex items-center justify-between text-sm py-1"
                            >
                              <span className="text-muted-foreground">
                                {new Date(nextDue).toLocaleDateString()}
                              </span>
                              <span className="flex-1 px-3 truncate">{expense.name}</span>
                              <span className="font-medium">
                                {formatCurrency
                                  ? formatCurrency(expense.amount)
                                  : `$${Number(expense.amount).toLocaleString()}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    })()
                  )}
                </CardContent>
              </Card>

              {/* House Rules */}
              <PropertyRulesEditor
                rules={property.rules}
                rulesVisibleToTenants={property.rules_visible_to_tenants ?? false}
                onSave={handleSaveRules}
              />

              {/* Property Metadata */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Property Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Date Created</span>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(property.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {property.property_type && (
                    <div>
                      <span className="text-sm text-muted-foreground">Residence Type</span>
                      <p className="text-sm font-medium text-foreground">
                        {property.property_type}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stripe Connect Onboarding - Only show if Stripe Connect is enabled */}
              {isFeatureEnabled('ENABLE_STRIPE_CONNECT') && (
                <ConnectOnboarding propertyId={property.id} />
              )}

              {/* Payment Settings - Only show if Stripe Connect is enabled */}
              {isFeatureEnabled('ENABLE_STRIPE_CONNECT') && (
                <PaymentSettingsForm propertyId={property.id} />
              )}
            </div>
          </TabsContent>

          {/* Tenants Tab */}
          <TabsContent value="tenants" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Tenants</h2>
                  <p className="text-muted-foreground">Manage tenants for this property</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 border border-border rounded-md p-1">
                    <Button
                      variant={tenantView === 'active' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTenantView('active')}
                    >
                      Active
                    </Button>
                    <Button
                      variant={tenantView === 'all' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTenantView('all')}
                    >
                      All
                    </Button>
                  </div>
                  {!showInviteForm && (
                    <Button onClick={() => setShowInviteForm(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Invite Tenant
                    </Button>
                  )}
                </div>
              </div>

              {showInviteForm && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Invite Tenant</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TenantInviteForm
                      propertyId={id}
                      onCancel={() => setShowInviteForm(false)}
                      onSuccess={() => setShowInviteForm(false)}
                    />
                  </CardContent>
                </Card>
              )}

              {displayedTenants.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="py-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      {tenantView === 'active' ? 'No active tenants' : 'No tenants'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {displayedTenants.map(tenant => {
                    const isFormer =
                      tenant.lease_end_date && new Date(tenant.lease_end_date) < new Date()
                    const tenantName = tenant.user?.email?.split('@')[0] || 'Tenant'
                    const initials = tenantName.charAt(0).toUpperCase()

                    return (
                      <Card key={tenant.id} className={cn('glass-card', isFormer && 'opacity-60')}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            {/* Profile Photo Placeholder */}
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-foreground shrink-0">
                              {initials}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-foreground">
                                  {tenant.user?.email || 'Unknown Tenant'}
                                </h3>
                                {isFormer && <Badge variant="outline">Former</Badge>}
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    Move-in: {new Date(tenant.move_in_date).toLocaleDateString()}
                                  </span>
                                </div>
                                {tenant.lease_end_date && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                      Lease ends:{' '}
                                      {new Date(tenant.lease_end_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate('/landlord/tenants')}
                                >
                                  View Details
                                </Button>
                                {messagingEnabled && id && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      await navigateToTenantMessaging(
                                        tenant.id,
                                        id,
                                        'general',
                                        'landlord',
                                        url => navigate(url)
                                      )
                                    }}
                                    title="Message tenant"
                                  >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Message
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnlinkTenant(tenant.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Work Orders Tab */}
          <TabsContent value="work-orders" className="mt-6">
            <div className="space-y-6 min-h-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Work Orders</h2>
                  <p className="text-muted-foreground">Maintenance requests for this property</p>
                </div>
                {!showWorkOrderForm && (
                  <Button onClick={() => setShowWorkOrderForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Work Order
                  </Button>
                )}
              </div>

              {showWorkOrderForm && (
                <div className="w-full">
                  <WorkOrderForm
                    propertyId={id}
                    onSubmit={() => {
                      setShowWorkOrderForm(false)
                      refetchWorkOrders()
                    }}
                    onCancel={() => setShowWorkOrderForm(false)}
                  />
                </div>
              )}

              {workOrders.length === 0 && !showWorkOrderForm ? (
                <Card className="glass-card">
                  <CardContent className="py-12 text-center">
                    <Wrench className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">No work orders for this property</p>
                    <Button variant="outline" onClick={() => setShowWorkOrderForm(true)}>
                      Create Work Order
                    </Button>
                  </CardContent>
                </Card>
              ) : workOrders.length > 0 ? (
                <div className="space-y-3">
                  {workOrders.map(request => {
                    const statusColors = {
                      pending:
                        'bg-yellow-500/30 text-yellow-100 dark:text-yellow-50 border-yellow-500/50',
                      in_progress:
                        'bg-blue-500/30 text-blue-100 dark:text-blue-50 border-blue-500/50',
                      completed:
                        'bg-green-500/30 text-green-100 dark:text-green-50 border-green-500/50',
                    }

                    return (
                      <Card key={request.id} className="glass-card">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">
                                {request.category || 'Maintenance Request'}
                              </CardTitle>
                              <CardDescription className="mt-1 flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  Created: {new Date(request.created_at).toLocaleDateString()}
                                </span>
                              </CardDescription>
                            </div>
                            <Badge
                              className={cn(
                                'text-xs',
                                statusColors[request.status as keyof typeof statusColors] ||
                                  'bg-stone-500/30 text-stone-100'
                              )}
                            >
                              {request.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-foreground mb-3 whitespace-pre-wrap">
                            {request.description}
                          </p>
                          {request.tenant?.user?.email && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span>Created by: {request.tenant.user.email}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : null}

              <div className="pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/landlord/operations')}
                >
                  View All Work Orders
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Expenses</h2>
                  <p className="text-muted-foreground">
                    Track and manage expenses for this property.
                  </p>
                </div>
                <UiButton
                  onClick={() => {
                    setEditingExpenseId(null)
                    setShowExpenseModal(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </UiButton>
              </div>

              <Card className="glass-card">
                <CardHeader>
                  <CardDescription>
                    {expenses.length} expense{expenses.length === 1 ? '' : 's'} for this property
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {expensesLoading ? (
                    <p className="text-sm text-muted-foreground">Loading expenses…</p>
                  ) : expenses.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        No expenses recorded yet for this property.
                      </p>
                      <UiButton
                        size="sm"
                        onClick={() => {
                          setEditingExpenseId(null)
                          setShowExpenseModal(true)
                        }}
                      >
                        Add Expense
                      </UiButton>
                    </div>
                  ) : (
                    <div className="w-full overflow-x-auto">
                      <div className="min-w-[640px]">
                        <div className="grid grid-cols-[2fr,1fr,1fr,1.5fr,1fr,0.5fr] gap-3 pb-2 border-b border-border text-xs font-medium text-muted-foreground">
                          <span>Expense</span>
                          <span>Category</span>
                          <span>Amount</span>
                          <span>Type</span>
                          <span>Next Due</span>
                          <span className="text-right">Status</span>
                        </div>
                        <div className="divide-y divide-border">
                          {expenses.map(expense => {
                            const typeLabel =
                              expense.type ?? (expense.is_recurring ? 'Recurring' : 'One-time')
                            const nextDue = getNextDueDate(expense)
                            const statusLabel =
                              expense.status ?? (expense.is_recurring ? 'Planned' : 'Planned')
                            return (
                              <div
                                key={expense.id}
                                className="grid grid-cols-[2fr,1fr,1fr,1.5fr,1fr,0.5fr] gap-3 py-3 items-center text-sm"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-foreground">
                                    {expense.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(getExpenseDate(expense as any)).toLocaleDateString()}
                                  </span>
                                </div>
                                <span className="text-xs capitalize">
                                  {expense.category || '—'}
                                </span>
                                <span className="font-medium">
                                  {formatCurrency
                                    ? formatCurrency(expense.amount)
                                    : `$${Number(expense.amount).toLocaleString()}`}
                                </span>
                                <span className="text-xs">{typeLabel}</span>
                                <span className="text-xs">
                                  {nextDue ? new Date(nextDue).toLocaleDateString() : '—'}
                                </span>
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {statusLabel}
                                  </span>
                                  <UiButton
                                    variant="ghost"
                                    size="xs"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => {
                                      setEditingExpenseId(expense.id)
                                      setShowExpenseModal(true)
                                    }}
                                  >
                                    Edit
                                  </UiButton>
                                  <UiButton
                                    variant="ghost"
                                    size="xs"
                                    className="h-7 px-2 text-xs"
                                    onClick={async () => {
                                      await markExpensePaid(expense.id, 'all')
                                    }}
                                  >
                                    Mark Paid
                                  </UiButton>
                                  <UiButton
                                    variant="ghost"
                                    size="xs"
                                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                    onClick={async () => {
                                      if (
                                        !confirm('Are you sure you want to delete this expense?')
                                      ) {
                                        return
                                      }
                                      await deleteExpense(expense.id)
                                    }}
                                  >
                                    Delete
                                  </UiButton>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-6">
            {id && <PropertyDocuments propertyId={id} />}
          </TabsContent>

          <TabsContent value="onboarding" className="mt-6">
            {id && <OnboardingTemplateEditor propertyId={id} />}
          </TabsContent>
        </Tabs>

        {/* Add/Edit Expense Modal (shared between Overview widget and Expenses tab) */}
        {showExpenseModal && id && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => {
                setShowExpenseModal(false)
                setEditingExpenseId(null)
              }}
            />
            <div className="relative z-10 w-full max-w-lg">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {editingExpenseId ? 'Edit Expense' : 'Add Expense'}
                  </CardTitle>
                  <CardDescription>For {property.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExpenseForm
                    defaultPropertyId={id}
                    lockProperty={true}
                    initialData={
                      editingExpenseId
                        ? (() => {
                            const expense = expenses.find(e => e.id === editingExpenseId)
                            if (!expense) return undefined
                            return {
                              id: expense.id,
                              property_id: expense.property_id,
                              name: expense.name,
                              amount: expense.amount,
                              date: getExpenseDate(expense as any),
                              category: expense.category,
                              is_recurring: expense.is_recurring,
                              recurring_frequency: expense.recurring_frequency,
                              recurring_start_date: expense.recurring_start_date,
                              recurring_end_date: expense.recurring_end_date,
                              notes: (expense as any).notes ?? null,
                            }
                          })()
                        : {
                            property_id: id,
                            name: '',
                            amount: 0,
                            date: new Date().toISOString().split('T')[0],
                          }
                    }
                    onSubmit={async data => {
                      if (editingExpenseId) {
                        const result = await updateExpense(editingExpenseId, data as any)
                        if (!result.error) {
                          setShowExpenseModal(false)
                          setEditingExpenseId(null)
                        }
                        return { error: result.error }
                      } else {
                        const result = await createExpense(data as any)
                        if (!result.error) {
                          setShowExpenseModal(false)
                        }
                        return { error: result.error }
                      }
                    }}
                    onCancel={() => {
                      setShowExpenseModal(false)
                      setEditingExpenseId(null)
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
