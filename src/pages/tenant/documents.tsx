import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useTenantData } from '@/hooks/use-tenant-data'
import { useDocuments } from '@/hooks/use-documents'
import { useLeases } from '@/hooks/use-leases'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Download, File } from 'lucide-react'
import { motion as motionTokens, createSpring } from '@/lib/motion'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'

export function TenantDocuments() {
  // Track performance metrics
  usePerformanceTracker({ componentName: 'TenantDocuments' })
  const { data: tenantData, loading: tenantLoading } = useTenantData()
  const { leases } = useLeases(undefined, tenantData?.tenant.id)
  // Get first active lease for the tenant (tenants typically have one active lease)
  const activeLease = leases?.find(
    l => !l.lease_end_date || new Date(l.lease_end_date) > new Date()
  )
  const [categoryOption, setCategoryOption] = useState<string>('')
  const [customCategory, setCustomCategory] = useState<string>('')
  const { documents, loading: documentsLoading, uploadDocument } = useDocuments(
    activeLease?.id,
    tenantData?.property.id
  )
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cardSpring = createSpring('card')

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeLease?.id || !tenantData?.property.id) return

    setError(null)
    setUploading(true)

    try {
      const resolvedCategory =
        categoryOption === 'other' ? customCategory.trim() : categoryOption.trim()
      await uploadDocument(file, activeLease.id, tenantData.property.id, resolvedCategory || undefined)
      e.target.value = ''
      setCategoryOption('')
      setCustomCategory('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  if (tenantLoading || documentsLoading) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 relative">
        <GrainOverlay />
        <div className="text-center py-12 relative z-10">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!tenantData) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 relative">
        <GrainOverlay />
        <Card className="relative z-10">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You&apos;ll be able to access documents once your landlord adds you to a lease.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-foreground mb-2">Documents</h1>
          <p className="text-muted-foreground">
            Access property documents and upload files to share with your landlord.
          </p>
        </div>

        {activeLease && tenantData.property && (
          <div className="mb-8">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Upload a Document</CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 text-sm text-destructive bg-destructive/20 rounded-md border border-destructive/30">
                    {error}
                  </div>
                )}
                <div className="space-y-4">
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Category (optional)</p>
                      <select
                        value={categoryOption}
                        onChange={e => setCategoryOption(e.target.value)}
                        disabled={uploading}
                        className="h-9 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select a category</option>
                        <option value="Lease">Lease</option>
                        <option value="Identification">Identification</option>
                        <option value="Income verification">Income verification</option>
                        <option value="Pet documentation">Pet documentation</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Financial">Financial</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    {categoryOption === 'other' && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Custom label</p>
                        <Input
                          value={customCategory}
                          onChange={e => setCustomCategory(e.target.value)}
                          placeholder="e.g., Application, Reference letter"
                          disabled={uploading}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="flex-1"
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    />
                    {uploading && (
                      <span className="text-sm text-muted-foreground">Uploading...</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {documents.length === 0 ? (
          <EmptyState
            icon={<File className="h-8 w-8" />}
            title="No documents available"
            description="Documents will appear here when your landlord uploads them for your lease."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {documents.map(document => (
                <motion.div
                  key={document.id}
                  initial={{ opacity: motionTokens.opacity.hidden, y: 4 }}
                  animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
                  exit={{ opacity: motionTokens.opacity.hidden, y: -4 }}
                  whileHover={{
                    y: -2,
                  }}
                  transition={{
                    type: 'spring',
                    ...cardSpring,
                  }}
                >
                  <Card className="glass-card">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <File className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{document.file_name}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Uploaded</p>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(document.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {document.file_type && (
                          <div>
                            <p className="text-xs text-muted-foreground">Type</p>
                            <p className="text-sm font-medium text-foreground">
                              {document.file_type}
                            </p>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => window.open(document.file_url, '_blank')}
                          aria-label={`Download ${document.file_name}`}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
