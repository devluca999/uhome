import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { PropertyForm } from '@/components/landlord/property-form'
import { LeaseForm } from '@/components/landlord/lease-form'
import { LeaseSummaryCard } from '@/components/landlord/lease-summary-card'
import { NotesPanel } from '@/components/landlord/notes-panel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLeases } from '@/hooks/use-leases'
import { useProperties } from '@/hooks/use-properties'
import { ArrowLeft, Plus } from 'lucide-react'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import type { Database } from '@/types/database'

type Property = Database['public']['Tables']['properties']['Row']

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>()
  const { updateProperty } = useProperties()
  const { leases, createLease, updateLease, deleteLease } = useLeases(id)
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showLeaseForm, setShowLeaseForm] = useState(false)
  const [editingLease, setEditingLease] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchProperty()
    }
  }, [id])

  async function fetchProperty() {
    if (!id) return

    try {
      setLoading(true)
      const { data, error } = await supabase.from('properties').select('*').eq('id', id).single()

      if (error) throw error
      setProperty(data)
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

  async function handleCreateLease(data: Parameters<typeof createLease>[0]) {
    const result = await createLease(data)
    if (!result.error) {
      setShowLeaseForm(false)
    }
  }

  async function handleUpdateLease(leaseId: string, data: Parameters<typeof updateLease>[1]) {
    const result = await updateLease(leaseId, data)
    if (!result.error) {
      setEditingLease(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 relative">
        <GrainOverlay />
        <div className="relative z-10 text-center py-12">
          <p className="text-muted-foreground">Loading property...</p>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="container mx-auto px-4 py-8 relative">
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
      <div className="container mx-auto px-4 py-8 max-w-2xl relative">
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
    <div className="container mx-auto px-4 py-8 max-w-4xl relative">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
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
            </div>
            <Button onClick={() => setEditing(true)}>Edit Property</Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
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
              {property.property_type && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium text-foreground">{property.property_type}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Created</span>
                <p className="text-sm font-medium text-foreground">
                  {new Date(property.created_at).toLocaleDateString()}
                </p>
              </div>
              {property.updated_at !== property.created_at && (
                <div>
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(property.updated_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {property.rules && (
          <Card className="glass-card mt-6">
            <CardHeader>
              <CardTitle>House Rules / Considerations</CardTitle>
              <CardDescription>Visible to tenants</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{property.rules}</p>
            </CardContent>
          </Card>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Lease History</h2>
              <p className="text-muted-foreground">Lease metadata for this property</p>
            </div>
            {!showLeaseForm && (
              <Button onClick={() => setShowLeaseForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Lease
              </Button>
            )}
          </div>

          {showLeaseForm && (
            <div className="mb-6">
              <LeaseForm
                propertyId={id}
                onSubmit={handleCreateLease}
                onCancel={() => setShowLeaseForm(false)}
              />
            </div>
          )}

          {leases.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {leases.map((lease, index) => (
                <LeaseSummaryCard key={lease.id} lease={lease} index={index} />
              ))}
            </div>
          ) : (
            <Card className="glass-card">
              <CardContent className="py-6 text-center text-muted-foreground">
                No leases recorded yet.
              </CardContent>
            </Card>
          )}
        </div>

        {id && (
          <div className="mt-6">
            <NotesPanel entityType="property" entityId={id} />
          </div>
        )}
      </div>
    </div>
  )
}
