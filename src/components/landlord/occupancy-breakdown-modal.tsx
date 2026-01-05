import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BreakdownModal, type BreakdownSection } from '@/components/ui/breakdown-modal'
import { useProperties } from '@/hooks/use-properties'
import { useTenants } from '@/hooks/use-tenants'
import { calculateOccupancyRate } from '@/lib/finance-calculations'
import { Button } from '@/components/ui/button'

interface OccupancyBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OccupancyBreakdownModal({ isOpen, onClose }: OccupancyBreakdownModalProps) {
  const navigate = useNavigate()
  const { properties } = useProperties()
  const { tenants } = useTenants()

  const sections = useMemo((): BreakdownSection[] => {
    // Categorize properties
    const fullyOccupied: typeof properties = []
    const partiallyOccupied: typeof properties = []
    const vacant: typeof properties = []

    properties.forEach(property => {
      const propertyTenants = tenants.filter(t => t.property_id === property.id)
      const tenantCount = propertyTenants.length

      if (tenantCount === 0) {
        vacant.push(property)
      } else {
        // For MVP, we consider a property "fully occupied" if it has tenants
        // In a more sophisticated system, we'd check against unit count
        fullyOccupied.push(property)
      }
    })

    const totalProperties = properties.length
    const fullyOccupiedCount = fullyOccupied.length
    const vacantCount = vacant.length

    return [
      {
        label: 'Fully Occupied',
        value: fullyOccupiedCount,
        percentage: totalProperties > 0 ? (fullyOccupiedCount / totalProperties) * 100 : 0,
        color: 'green',
        breakdown: fullyOccupied.map(p => ({
          label: p.name,
          value: tenants.filter(t => t.property_id === p.id).length,
        })),
      },
      {
        label: 'Vacant',
        value: vacantCount,
        percentage: totalProperties > 0 ? (vacantCount / totalProperties) * 100 : 0,
        color: 'yellow',
        breakdown: vacant.map(p => ({
          label: p.name,
          value: 0,
        })),
      },
    ]
  }, [properties, tenants])

  const overallOccupancyRate = useMemo(() => {
    return calculateOccupancyRate(properties, tenants)
  }, [properties, tenants])

  const breakdownComponent = (
    <div className="space-y-4">
      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Overall Occupancy Rate</span>
          <span className="text-lg font-semibold text-foreground">
            {Math.round(overallOccupancyRate)}%
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <BreakdownModal
      isOpen={isOpen}
      onClose={onClose}
      title="Occupancy Breakdown"
      description="Property occupancy status distribution"
      sections={sections}
      breakdownComponent={breakdownComponent}
      cta={{
        label: 'View all properties',
        action: () => {
          onClose()
          navigate('/landlord/properties')
        },
      }}
    />
  )
}
