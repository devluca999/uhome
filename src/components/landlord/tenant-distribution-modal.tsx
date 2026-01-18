import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BreakdownModal, type BreakdownSection } from '@/components/ui/breakdown-modal'
import { useProperties } from '@/hooks/use-properties'
import { useTenants } from '@/hooks/use-tenants'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TenantDistributionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TenantDistributionModal({ isOpen, onClose }: TenantDistributionModalProps) {
  const navigate = useNavigate()
  const { properties } = useProperties()
  const { tenants } = useTenants()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)

  // Calculate tenant distribution per property
  const tenantDistribution = useMemo(() => {
    return properties.map(property => {
      const propertyTenants = tenants.filter(t => t.property_id === property.id)
      return {
        property,
        tenantCount: propertyTenants.length,
        tenants: propertyTenants,
      }
    })
  }, [properties, tenants])

  const sections = useMemo((): BreakdownSection[] => {
    return tenantDistribution.map(({ property, tenantCount }) => {
      return {
        label: property.name,
        value: tenantCount,
        color: tenantCount > 0 ? 'green' : 'yellow',
        breakdown: [{ label: 'Tenant count', value: tenantCount }],
        isCurrency: false, // This is a count, not currency
      }
    })
  }, [tenantDistribution])

  // Filter tenants by selected property
  const filteredTenants = useMemo(() => {
    if (!selectedPropertyId) return []
    return tenants.filter(t => t.property_id === selectedPropertyId)
  }, [selectedPropertyId, tenants])

  const breakdownComponent = (
    <div className="space-y-4">
      <div className="space-y-2">
        {tenantDistribution.map(({ property, tenantCount, tenants: propertyTenants }) => (
          <button
            key={property.id}
            onClick={() =>
              setSelectedPropertyId(selectedPropertyId === property.id ? null : property.id)
            }
            className={cn(
              'w-full text-left p-3 rounded-md border-2 transition-all',
              selectedPropertyId === property.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-foreground">{property.name}</span>
              <span className="text-sm text-muted-foreground">
                {tenantCount} tenant{tenantCount !== 1 ? 's' : ''}
              </span>
            </div>
            {selectedPropertyId === property.id && propertyTenants.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border space-y-1">
                {propertyTenants.map(tenant => (
                  <div key={tenant.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">
                      {tenant.user?.email || 'Unknown tenant'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        onClose()
                        navigate('/landlord/tenants')
                      }}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
      {!selectedPropertyId && (
        <div className="pt-2">
          <p className="text-sm text-muted-foreground">
            Click on a property above to see its tenants
          </p>
        </div>
      )}
    </div>
  )

  return (
    <BreakdownModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tenant Distribution"
      description="Tenant count and occupancy per property"
      sections={sections}
      isCurrency={false}
      breakdownComponent={breakdownComponent}
      cta={{
        label: 'View all tenants',
        action: () => {
          onClose()
          navigate('/landlord/tenants')
        },
      }}
    />
  )
}
