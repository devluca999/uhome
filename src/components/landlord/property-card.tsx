import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePropertyGroupAssignments } from '@/hooks/use-property-groups'
import { usePropertyGroups } from '@/hooks/use-property-groups'
import { useTenants } from '@/hooks/use-tenants'
import { useUnits } from '@/hooks/use-units'
import { useProperties } from '@/hooks/use-properties'
import { NotesPanel } from '@/components/landlord/notes-panel'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { TenantListModal } from '@/components/landlord/tenant-list-modal'
import { WorkOrderListModal } from '@/components/landlord/work-order-list-modal'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import type { Database } from '@/types/database'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { useMemo, useState, useEffect } from 'react'
import {
  Users,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Property = Database['public']['Tables']['properties']['Row']

interface PropertyCardProps {
  property: Property
  onDelete?: (id: string) => void
}

export function PropertyCard({ property, onDelete }: PropertyCardProps) {
  const { assignments } = usePropertyGroupAssignments(property.id)
  const { groups } = usePropertyGroups()
  const { tenants } = useTenants()
  const { units } = useUnits(property.id)
  const { updateProperty } = useProperties()
  const { requests: workOrders } = useMaintenanceRequests(property.id)
  const [expanded, setExpanded] = useState(false)
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null)
  const [updatingRules, setUpdatingRules] = useState(false)
  const [editingRules, setEditingRules] = useState(false)
  const [rulesContent, setRulesContent] = useState(property.rules || '')
  const [savingRules, setSavingRules] = useState(false)
  const [tenantModalOpen, setTenantModalOpen] = useState(false)
  const [workOrderModalOpen, setWorkOrderModalOpen] = useState(false)

  // Update rulesContent when property.rules changes
  useEffect(() => {
    if (!editingRules) {
      setRulesContent(property.rules || '')
    }
  }, [property.rules, editingRules])

  // Use database value, default to false if not set
  const rulesVisible = property.rules_visible_to_tenants ?? false

  // Calculate occupancy
  const propertyTenants = tenants.filter(t => t.property_id === property.id)
  const occupancyCount = propertyTenants.length
  const isOccupied = occupancyCount > 0

  // Calculate work order count
  const workOrderCount = workOrders.length

  // Memoize property groups to avoid infinite loops
  // Use stringified arrays for comparison since assignments is recreated each render
  const assignmentsKey = JSON.stringify([...assignments].sort())
  const groupsKey = JSON.stringify(groups.map(g => g.id).sort())

  const propertyGroups = useMemo(() => {
    if (assignments.length > 0 && groups.length > 0) {
      return groups.filter(g => assignments.includes(g.id))
    }
    return []
  }, [assignmentsKey, groupsKey])

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${property.name}?`)) {
      onDelete?.(property.id)
    }
  }

  async function handleToggleRulesVisibility() {
    setUpdatingRules(true)
    try {
      await updateProperty(property.id, {
        rules_visible_to_tenants: !rulesVisible,
      })
    } catch (error) {
      console.error('Error updating rules visibility:', error)
    } finally {
      setUpdatingRules(false)
    }
  }

  async function handleSaveRules() {
    setSavingRules(true)
    try {
      await updateProperty(property.id, {
        rules: rulesContent.trim() || null,
      })
      setEditingRules(false)
    } catch (error) {
      console.error('Error saving rules:', error)
    } finally {
      setSavingRules(false)
    }
  }

  async function handleDeleteRules() {
    if (!confirm('Are you sure you want to delete the house rules?')) return
    setSavingRules(true)
    try {
      await updateProperty(property.id, {
        rules: null,
      })
      setRulesContent('')
      setEditingRules(false)
    } catch (error) {
      console.error('Error deleting rules:', error)
    } finally {
      setSavingRules(false)
    }
  }

  function handleStartEditRules() {
    setRulesContent(property.rules || '')
    setEditingRules(true)
  }

  function handleCancelEditRules() {
    setRulesContent(property.rules || '')
    setEditingRules(false)
  }

  return (
    <motion.div
      initial={{ opacity: motionTokens.opacity.hidden, y: 4 }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      exit={{ opacity: motionTokens.opacity.hidden, y: -4 }}
      transition={{
        duration: durationToSeconds(motionTokens.duration.base),
        ease: motionTokens.ease.standard,
      }}
    >
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl">{property.name}</CardTitle>
              {property.address && (
                <CardDescription className="mt-1">{property.address}</CardDescription>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {property.property_type && (
                  <Badge variant="outline" className="text-xs">
                    {property.property_type}
                  </Badge>
                )}
                {propertyGroups.map(group => (
                  <Badge key={group.id} variant="secondary" className="text-xs">
                    {group.name}
                  </Badge>
                ))}
              </div>
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
                <span className="text-sm text-muted-foreground">Due Date</span>
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
            {/* Occupancy Indicator */}
            <motion.div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => occupancyCount > 0 && setTenantModalOpen(true)}
              animate={isOccupied ? { scale: [1, 1.05, 1] } : {}}
              transition={{
                duration: motionTokens.duration.fast,
                ease: motionTokens.easing.standard,
              }}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Occupancy</span>
              </div>
              <Badge
                variant={isOccupied ? 'default' : 'outline'}
                className={cn(
                  'text-xs',
                  occupancyCount > 0 && 'hover:opacity-80 transition-opacity'
                )}
              >
                {occupancyCount} tenant{occupancyCount !== 1 ? 's' : ''}
              </Badge>
            </motion.div>
            {/* Work Orders Indicator */}
            <motion.div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => workOrderCount > 0 && setWorkOrderModalOpen(true)}
              animate={workOrderCount > 0 ? { scale: [1, 1.05, 1] } : {}}
              transition={{
                duration: motionTokens.duration.fast,
                ease: motionTokens.easing.standard,
              }}
            >
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Work Orders</span>
              </div>
              <Badge
                variant={workOrderCount > 0 ? 'default' : 'outline'}
                className={cn(
                  'text-xs',
                  workOrderCount > 0 && 'hover:opacity-80 transition-opacity'
                )}
              >
                {workOrderCount} {workOrderCount === 1 ? 'order' : 'orders'}
              </Badge>
            </motion.div>
            {/* House Rules Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">House Rules</span>
              <div className="flex items-center gap-2">
                {property.rules && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleRulesVisibility}
                    disabled={updatingRules}
                    className={cn(
                      'h-auto p-1',
                      rulesVisible && 'bg-primary/10 text-primary',
                      !rulesVisible && 'text-muted-foreground'
                    )}
                    aria-label={rulesVisible ? 'Hide rules from tenants' : 'Show rules to tenants'}
                    aria-pressed={rulesVisible}
                  >
                    {rulesVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                )}
                {!editingRules && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEditRules}
                    className="h-auto p-1"
                    aria-label={property.rules ? 'Edit rules' : 'Add rules'}
                  >
                    {property.rules ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" asChild className="flex-1">
                <Link to={`/landlord/properties/${property.id}`}>View Details</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                aria-label={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-destructive hover:text-destructive/90"
                >
                  Delete
                </Button>
              )}
            </div>
            {/* Expanded Content */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{
                    duration: motionTokens.duration.normal,
                    ease: motionTokens.easing.standard,
                  }}
                  className="pt-4 border-t border-border space-y-3"
                >
                  {/* House Rules Editor */}
                  <div className="border border-border rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-medium">House Rules</span>
                    </div>
                    {editingRules ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: motionTokens.duration.fast,
                          ease: motionTokens.easing.standard,
                        }}
                        className="space-y-3"
                      >
                        <MarkdownEditor
                          value={rulesContent}
                          onChange={setRulesContent}
                          placeholder="Enter house rules (markdown supported)..."
                          disabled={savingRules}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveRules} disabled={savingRules}>
                            {savingRules ? 'Saving...' : 'Save Rules'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEditRules}
                            disabled={savingRules}
                          >
                            Cancel
                          </Button>
                          {property.rules && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDeleteRules}
                              disabled={savingRules}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ) : property.rules ? (
                      <div className="space-y-2">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <MarkdownRenderer content={property.rules} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No house rules set. Click the plus icon to add rules.
                      </p>
                    )}
                  </div>
                  {propertyTenants.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Tenants</span>
                      <div className="mt-1 space-y-1">
                        {propertyTenants.map(tenant => (
                          <p key={tenant.id} className="text-sm text-foreground">
                            {tenant.user?.email || `Tenant ${tenant.id.slice(0, 8)}`}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Units Section */}
                  {units.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground mb-2 block">Units</span>
                      <div className="space-y-2">
                        {units.map(unit => (
                          <div key={unit.id} className="border border-border rounded-md p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-foreground">
                                {unit.unit_name}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setExpandedUnitId(expandedUnitId === unit.id ? null : unit.id)
                                }
                                className="h-6 text-xs"
                              >
                                {expandedUnitId === unit.id ? (
                                  <>
                                    <ChevronUp className="w-3 h-3 mr-1" />
                                    Hide Notes
                                  </>
                                ) : (
                                  <>
                                    <FileText className="w-3 h-3 mr-1" />
                                    Notes
                                  </>
                                )}
                              </Button>
                            </div>
                            <AnimatePresence>
                              {expandedUnitId === unit.id && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{
                                    duration: motionTokens.duration.normal,
                                    ease: motionTokens.easing.standard,
                                  }}
                                  className="overflow-hidden"
                                >
                                  <NotesPanel
                                    entityType="unit"
                                    entityId={unit.id}
                                    className="mt-2"
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

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
    </motion.div>
  )
}
