import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { PropertyForm } from '@/components/landlord/property-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import type { Database } from '@/types/database'

type Property = Database['public']['Tables']['properties']['Row']

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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
  }) {
    if (!id) return

    setSubmitting(true)
    try {
      const { data: updated, error } = await supabase
        .from('properties')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setProperty(updated)
      setEditing(false)
    } catch (error) {
      console.error('Error updating property:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-stone-600">Loading property...</p>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-stone-600 mb-4">Property not found</p>
          <Button asChild variant="outline">
            <Link to="/landlord/properties">Back to Properties</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
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
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/landlord/properties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Properties
          </Link>
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-stone-900">{property.name}</h1>
            {property.address && <p className="text-stone-600 mt-1">{property.address}</p>}
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
              <span className="text-stone-600">Monthly Rent</span>
              <span className="text-xl font-semibold">
                ${property.rent_amount.toLocaleString()}
              </span>
            </div>
            {property.rent_due_date && (
              <div className="flex items-center justify-between">
                <span className="text-stone-600">Due Date</span>
                <span className="font-medium">
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
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-stone-600">Created</span>
              <p className="text-sm font-medium">
                {new Date(property.created_at).toLocaleDateString()}
              </p>
            </div>
            {property.updated_at !== property.created_at && (
              <div>
                <span className="text-sm text-stone-600">Last Updated</span>
                <p className="text-sm font-medium">
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
            <p className="text-stone-700 whitespace-pre-wrap">{property.rules}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
