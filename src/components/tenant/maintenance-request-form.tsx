import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useImageUpload } from '@/hooks/use-image-upload'
import { Upload, X } from 'lucide-react'

interface MaintenanceRequestFormProps {
  propertyId?: string
  tenantId?: string
  leaseId?: string
  onSubmit: () => void
  onCancel: () => void
}

export function MaintenanceRequestForm({
  propertyId,
  tenantId,
  leaseId,
  onSubmit,
  onCancel,
}: MaintenanceRequestFormProps) {
  const { user } = useAuth()
  const { uploadImage, uploading: uploadingImages } = useImageUpload('images')
  const [categoryOption, setCategoryOption] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [publicDescription, setPublicDescription] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!publicDescription.trim()) {
      setError('Description is required')
      return
    }

    if (!user) {
      setError('You must be logged in')
      return
    }

    const resolvedCategory =
      categoryOption === 'other' ? customCategory.trim() : categoryOption.trim()

    try {
      setLoading(true)
      const { error } = await supabase.from('maintenance_requests').insert({
        lease_id: leaseId || null,
        property_id: propertyId || null,
        tenant_id: tenantId || null,
        category: resolvedCategory || null,
        public_description: publicDescription.trim(),
        description: publicDescription.trim(), // Keep for backward compatibility
        status: 'submitted', // Tenant-created work orders start as submitted
        created_by: user.id,
        created_by_role: 'tenant',
        visibility_to_tenants: true, // Tenant-created requests are always visible
        image_urls: imageUrls.length > 0 ? imageUrls : null,
      })

      if (error) throw error

      onSubmit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !leaseId) return

    const scopeId = leaseId || propertyId
    if (!scopeId) {
      setError('Missing scope ID for image upload')
      return
    }

    const url = await uploadImage(file, scopeId)
    if (url) {
      setImageUrls([...imageUrls, url])
    }
    e.target.value = '' // Reset input
  }

  function removeImage(index: number) {
    setImageUrls(imageUrls.filter((_, i) => i !== index))
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Submit Maintenance Request</CardTitle>
        <CardDescription>Report an issue or request maintenance</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium text-foreground">
              Category (optional)
            </label>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <select
                id="category"
                value={categoryOption}
                onChange={e => setCategoryOption(e.target.value)}
                disabled={loading}
                className="h-9 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a category</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Heating &amp; Cooling">Heating &amp; Cooling</option>
                <option value="Appliances">Appliances</option>
                <option value="Water leak">Water leak</option>
                <option value="Doors &amp; locks">Doors &amp; locks</option>
                <option value="Pest control">Pest control</option>
                <option value="Safety">Safety</option>
                <option value="Cosmetic">Cosmetic</option>
                <option value="other">Other</option>
              </select>
              {categoryOption === 'other' && (
                <Input
                  id="category-other"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder="Custom category label"
                  disabled={loading}
                />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="publicDescription" className="text-sm font-medium text-foreground">
              Description *
            </label>
            <textarea
              id="publicDescription"
              value={publicDescription}
              onChange={e => setPublicDescription(e.target.value)}
              placeholder="Describe the issue or maintenance needed..."
              rows={6}
              required
              disabled={loading}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Photos (optional)</label>
            <div className="space-y-3">
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-20 object-cover rounded-md border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingImages || loading || imageUrls.length >= 5}
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadingImages ? 'Uploading...' : 'Add Photo'}
                </Button>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <span className="text-xs text-muted-foreground">{imageUrls.length}/5 photos</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
