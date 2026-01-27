import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Drawer } from '@/components/ui/drawer'
import { useTenants } from '@/hooks/use-tenants'
import { useProperties } from '@/hooks/use-properties'
import { useUrlParams } from '@/lib/url-params'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { Calendar, MapPin } from 'lucide-react'
// Badge, Mail, cn removed - not used

interface TenantListModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId?: string
}

export function TenantListModal({ isOpen, onClose, propertyId }: TenantListModalProps) {
  const navigate = useNavigate()
  const { setFilterParam } = useUrlParams()
  const { tenants } = useTenants()
  const { properties } = useProperties()

  const filteredTenants = useMemo(() => {
    if (!propertyId) return tenants
    return tenants.filter(t => t.property_id === propertyId)
  }, [tenants, propertyId])

  const property = useMemo(() => {
    if (!propertyId) return null
    return properties.find(p => p.id === propertyId)
  }, [properties, propertyId])

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={property ? `Tenants - ${property.name}` : 'All Tenants'}
      description={property ? property.address || undefined : 'All tenants across properties'}
      side="right"
    >
      <div className="space-y-4">
        {filteredTenants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No tenants found</p>
            {propertyId && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  onClose()
                  navigate('/landlord/tenants')
                }}
              >
                Add Tenant
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {filteredTenants.map(tenant => {
                const tenantProperty = properties.find(p => p.id === tenant.property_id)
                const moveInDate = new Date(tenant.move_in_date).toLocaleDateString()
                const leaseEndDate = tenant.lease_end_date
                  ? new Date(tenant.lease_end_date).toLocaleDateString()
                  : 'No end date'

                return (
                  <div
                    key={tenant.id}
                    className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">
                            {tenant.user?.email || 'Tenant'}
                          </h3>
                        </div>
                        {tenantProperty && (
                          <Link
                            to={`/landlord/properties/${tenant.property_id}`}
                            onClick={onClose}
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <MapPin className="w-3 h-3" />
                            {tenantProperty.name}
                            {tenantProperty.address && ` - ${tenantProperty.address}`}
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Move-in: {moveInDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Lease ends: {leaseEndDate}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => {
                        onClose()
                        if (propertyId) {
                          setFilterParam('propertyId', propertyId)
                        }
                        navigate('/landlord/tenants')
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                )
              })}
            </div>
            <div className="pt-4 border-t border-border">
              <Button
                variant="default"
                className="w-full"
                onClick={() => {
                  onClose()
                  if (propertyId) {
                    setFilterParam('propertyId', propertyId)
                  }
                  navigate('/landlord/tenants')
                }}
              >
                View All Tenants
              </Button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}
