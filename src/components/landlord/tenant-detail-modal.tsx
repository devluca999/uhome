import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Drawer } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { useLeases } from '@/hooks/use-leases'
import { useDocuments } from '@/hooks/use-documents'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { navigateToTenantMessaging } from '@/lib/messaging-helpers'
import { Mail, Phone, MapPin, FileText, ExternalLink, Edit, MessageSquare } from 'lucide-react'
import type { Tenant } from '@/hooks/use-tenants'

interface TenantDetailModalProps {
  isOpen: boolean
  onClose: () => void
  tenant: Tenant | null
  onEdit?: () => void
  onMessage?: () => void
}

export function TenantDetailModal({
  isOpen,
  onClose,
  tenant,
  onEdit,
  onMessage: _onMessage,
}: TenantDetailModalProps) {
  const navigate = useNavigate()
  const messagingEnabled = isFeatureEnabled('ENABLE_MESSAGING_ENTRY_POINTS')
  const [activeLease, setActiveLease] = useState<any>(null)
  const { leases } = useLeases(tenant?.property_id, tenant?.id)
  const { documents } = useDocuments(activeLease?.id, tenant?.property_id)

  const handleMessage = async (intent?: 'general' | 'maintenance' | 'billing' | 'notice') => {
    if (!tenant?.property_id) return
    onClose()
    await navigateToTenantMessaging(
      tenant.id,
      tenant.property_id,
      intent || 'general',
      'landlord',
      url => {
        navigate(url)
      }
    )
  }

  useEffect(() => {
    if (leases.length > 0 && tenant) {
      // Find active lease (status='active' or lease_end_date is null/future)
      const now = new Date()
      const active = leases.find(lease => {
        if (lease.status === 'active') return true
        if (lease.status === 'draft' || lease.status === 'ended') return false
        // Fallback: check dates if status not available
        if (lease.lease_end_date) {
          return new Date(lease.lease_end_date) > now
        }
        return lease.lease_start_date ? new Date(lease.lease_start_date) <= now : false
      })
      setActiveLease(active || leases[0])
    } else {
      setActiveLease(null)
    }
  }, [leases, tenant])

  if (!tenant) return null

  const moveInDate = new Date(tenant.move_in_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const leaseEndDate = tenant.lease_end_date
    ? new Date(tenant.lease_end_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'No end date'

  const isLeaseActive = tenant.lease_end_date ? new Date(tenant.lease_end_date) > new Date() : true

  // Filter key documents (lease agreements, receipts)
  const keyDocuments = documents.filter(doc => {
    const fileName = doc.file_name.toLowerCase()
    return (
      fileName.includes('lease') ||
      fileName.includes('agreement') ||
      fileName.includes('receipt') ||
      fileName.includes('rent')
    )
  })

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={tenant.user?.email || 'Tenant Details'}
      description={tenant.property?.name || 'Tenant information'}
      side="right"
    >
      <div className="space-y-6">
        {/* Contact Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Contact Information
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <a
                href={`mailto:${tenant.user?.email}`}
                className="text-foreground hover:text-primary transition-colors break-all"
              >
                {tenant.user?.email || 'No email'}
              </a>
            </div>
            {tenant.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <a
                  href={`tel:${tenant.phone}`}
                  className="text-foreground hover:text-primary transition-colors break-all"
                >
                  {tenant.phone}
                </a>
              </div>
            )}
            {tenant.property && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <Link
                  to={`/landlord/properties/${tenant.property_id}`}
                  onClick={onClose}
                  className="text-foreground hover:text-primary transition-colors flex items-center gap-1 break-words"
                >
                  <span className="break-words">
                    {tenant.property.name}
                    {tenant.property.address && ` - ${tenant.property.address}`}
                  </span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Lease Details */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Lease Details
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Move-in Date</span>
              <span className="font-medium text-foreground">{moveInDate}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Lease End Date</span>
              <span className="font-medium text-foreground">{leaseEndDate}</span>
            </div>
            {activeLease && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rent Amount</span>
                  <span className="font-medium text-foreground">
                    {activeLease.rent_amount
                      ? `$${activeLease.rent_amount.toLocaleString()} / ${activeLease.rent_frequency || 'month'}`
                      : 'Not set'}
                  </span>
                </div>
                {activeLease.security_deposit && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Security Deposit</span>
                    <span className="font-medium text-foreground">
                      ${activeLease.security_deposit.toLocaleString()}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={isLeaseActive ? 'default' : 'secondary'}>
                {isLeaseActive ? 'Active' : 'Ended'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Key Documents */}
        {keyDocuments.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Key Documents
            </h3>
            <div className="space-y-2">
              {keyDocuments.slice(0, 5).map(doc => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted/50 transition-colors group"
                >
                  <FileText className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                  <span className="text-sm text-foreground flex-1 truncate">{doc.file_name}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
                </a>
              ))}
              {documents.length > 5 && (
                <Link
                  to={`/landlord/documents?propertyId=${tenant.property_id}`}
                  onClick={onClose}
                  className="text-sm text-primary hover:underline"
                >
                  View all {documents.length} documents
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {tenant.notes && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Notes</h3>
            <div className="bg-muted/50 p-3 rounded-md">
              <MarkdownRenderer content={tenant.notes} />
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-4 border-t border-border space-y-2">
          <div className="flex gap-2">
            {messagingEnabled && tenant.property_id && (
              <Button variant="default" className="flex-1" onClick={() => handleMessage('general')}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Message Tenant
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" className="flex-1" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Tenant
              </Button>
            )}
          </div>
          {messagingEnabled && tenant.property_id && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMessage('maintenance')}
                className="text-xs"
              >
                Maintenance
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMessage('billing')}
                className="text-xs"
              >
                Billing
              </Button>
            </div>
          )}
          {tenant.property_id && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onClose()
              }}
              asChild
            >
              <Link to={`/landlord/properties/${tenant.property_id}`}>
                <MapPin className="w-4 h-4 mr-2" />
                View Property
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Drawer>
  )
}
