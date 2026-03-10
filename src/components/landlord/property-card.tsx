import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTenants } from '@/hooks/use-tenants'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import { useExpenses } from '@/hooks/use-expenses'
import { TenantListModal } from '@/components/landlord/tenant-list-modal'
import { WorkOrderListModal } from '@/components/landlord/work-order-list-modal'
import { ExpenseForm } from '@/components/landlord/expense-form'
import { Button } from '@/components/ui/button'
import type { Database } from '@/types/database'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { useMemo, useState } from 'react'
import { Users, Wrench, ChevronRight, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Property = Database['public']['Tables']['properties']['Row']

interface PropertyCardProps {
  property: Property
  onDelete?: (id: string) => void
}

export function PropertyCard({ property }: PropertyCardProps) {
  const navigate = useNavigate()
  const { tenants } = useTenants()
  const { requests: workOrders } = useMaintenanceRequests(property.id, true) // true = isPropertyId
  const { getAverageMonthlyUtilities, createExpense } = useExpenses(property.id)
  const [tenantModalOpen, setTenantModalOpen] = useState(false)
  const [workOrderModalOpen, setWorkOrderModalOpen] = useState(false)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)

  // Calculate occupancy
  const propertyTenants = useMemo(
    () => tenants.filter(t => t.property_id === property.id),
    [tenants, property.id]
  )
  const occupancyCount = propertyTenants.length

  // Calculate work order count
  const workOrderCount = workOrders.length

  // Calculate utility cost (average monthly)
  const utilityCost = useMemo(
    () => getAverageMonthlyUtilities(property.id),
    [getAverageMonthlyUtilities, property.id]
  )

  const handleCardClick = () => {
    navigate(`/landlord/properties/${property.id}`)
  }

  const handleTenantPillClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (occupancyCount > 0) {
      setTenantModalOpen(true)
    }
  }

  const handleWorkOrderPillClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (workOrderCount > 0) {
      setWorkOrderModalOpen(true)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: motionTokens.opacity.hidden, y: 4 }}
        animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
        exit={{ opacity: motionTokens.opacity.hidden, y: -4 }}
        transition={{
          duration: durationToSeconds(motionTokens.duration.base),
          ease: motionTokens.ease.standard,
        }}
      >
        <Card
          className={cn(
            'glass-card cursor-pointer hover:shadow-lg transition-shadow',
            property.is_active === false && 'opacity-50'
          )}
          onClick={handleCardClick}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">{property.name}</CardTitle>
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      property.is_active !== false ? 'bg-green-500' : 'bg-red-500'
                    )}
                    title={property.is_active !== false ? 'Active' : 'Inactive'}
                  />
                </div>
                {property.address && (
                  <CardDescription className="mt-1">{property.address}</CardDescription>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2 mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={e => {
                    e.stopPropagation()
                    setExpenseModalOpen(true)
                  }}
                  aria-label="Add expense"
                  title="Add expense"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Monthly Rent</span>
                <span className="text-lg font-semibold text-foreground">
                  ${property.rent_amount.toLocaleString()}
                </span>
              </div>
              {property.rent_due_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Rent Due Date</span>
                  <span className="text-sm font-medium">
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
              {utilityCost > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Utility Cost</span>
                  <span className="text-sm text-muted-foreground">
                    ${utilityCost.toFixed(2)}/mo avg
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={handleTenantPillClick}
                >
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tenants</span>
                </div>
                <Badge
                  variant={occupancyCount > 0 ? 'default' : 'outline'}
                  className={cn(
                    'text-xs',
                    occupancyCount > 0 && 'hover:opacity-80 transition-opacity cursor-pointer'
                  )}
                  onClick={handleTenantPillClick}
                >
                  {occupancyCount} {occupancyCount === 1 ? 'tenant' : 'tenants'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={handleWorkOrderPillClick}
                >
                  <Wrench className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Work Orders</span>
                </div>
                <Badge
                  variant={workOrderCount > 0 ? 'default' : 'outline'}
                  className={cn(
                    'text-xs',
                    workOrderCount > 0 && 'hover:opacity-80 transition-opacity cursor-pointer'
                  )}
                  onClick={handleWorkOrderPillClick}
                >
                  {workOrderCount} {workOrderCount === 1 ? 'order' : 'orders'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Expense Modal */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setExpenseModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="pr-2">
                  <CardTitle className="text-lg">Add Expense</CardTitle>
                  <CardDescription className="mt-1">
                    For {property.name}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setExpenseModalOpen(false)}
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ExpenseForm
                  defaultPropertyId={property.id}
                  lockProperty={true}
                  initialData={{
                    property_id: property.id,
                    name: '',
                    amount: 0,
                    date: new Date().toISOString().split('T')[0],
                  }}
                  onSubmit={async data => {
                    const result = await createExpense(data as any)
                    if (!result.error) {
                      setExpenseModalOpen(false)
                    }
                    return { error: result.error }
                  }}
                  onCancel={() => setExpenseModalOpen(false)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tenant List Modal */}
      <TenantListModal
        isOpen={tenantModalOpen}
        onClose={() => setTenantModalOpen(false)}
        propertyId={property.id}
      />

      {/* Work Order List Modal */}
      <WorkOrderListModal
        isOpen={workOrderModalOpen}
        onClose={() => setWorkOrderModalOpen(false)}
        propertyId={property.id}
      />
    </>
  )
}
