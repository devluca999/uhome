import { motion, AnimatePresence } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { useTenantData } from '@/hooks/use-tenant-data'
import { useDocuments } from '@/hooks/use-documents'
import { useLeases } from '@/hooks/use-leases'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Download, File, FolderPlus, Plus } from 'lucide-react'
import { motion as motionTokens, createSpring } from '@/lib/motion'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'
import {
  DOCUMENT_VISIBILITY_OPTIONS,
  type DocumentVisibility,
} from '@/types/document-visibility'

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

type FolderFilter = 'all' | 'uncategorized' | string

export function TenantDocuments() {
  usePerformanceTracker({ componentName: 'TenantDocuments' })
  const { data: tenantData, loading: tenantLoading } = useTenantData()
  const { leases } = useLeases(undefined, tenantData?.tenant.id)
  const activeLease = leases?.find(
    l => !l.lease_end_date || new Date(l.lease_end_date) > new Date()
  )
  const [categoryOption, setCategoryOption] = useState<string>('')
  const [customCategory, setCustomCategory] = useState<string>('')
  const [uploadVisibility, setUploadVisibility] = useState<DocumentVisibility>('landlord')
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all')
  const [visibilitySavingId, setVisibilitySavingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    documents,
    folders,
    loading: documentsLoading,
    uploadDocument,
    updateDocumentVisibility,
    createFolder,
  } = useDocuments(activeLease?.id, tenantData?.property.id, { viewer: 'tenant' })

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cardSpring = createSpring('card')

  const displayDocuments = useMemo(() => {
    if (folderFilter === 'all') return documents
    if (folderFilter === 'uncategorized') return documents.filter(d => !d.folder_id)
    return documents.filter(d => d.folder_id === folderFilter)
  }, [documents, folderFilter])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeLease?.id || !tenantData?.property.id) return

    setError(null)
    setUploading(true)

    try {
      const resolvedCategory =
        categoryOption === 'other' ? customCategory.trim() : categoryOption.trim()
      const folderId =
        folderFilter === 'all' || folderFilter === 'uncategorized' ? null : folderFilter
      await uploadDocument(
        file,
        activeLease.id,
        tenantData.property.id,
        resolvedCategory || undefined,
        {
          visibility: uploadVisibility,
          folderId,
        }
      )
      e.target.value = ''
      setCategoryOption('')
      setCustomCategory('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  async function handleNewFolder() {
    const name = window.prompt('Folder name')
    if (name == null) return
    setError(null)
    try {
      await createFolder(name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder')
    }
  }

  async function handleVisibilityChange(documentId: string, value: DocumentVisibility) {
    setError(null)
    setVisibilitySavingId(documentId)
    try {
      await updateDocumentVisibility(documentId, value)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update visibility')
    } finally {
      setVisibilitySavingId(null)
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
    <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen bg-background [isolation:isolate]">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
        onChange={handleFileUpload}
        disabled={uploading}
        aria-hidden
      />
      <div className="relative z-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-foreground mb-2">Documents</h1>
            <p className="text-muted-foreground">
              Access property documents and upload files to share with your landlord.
            </p>
          </div>
          {activeLease && tenantData.property && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="mr-2 h-4 w-4" />
                + Upload
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleNewFolder()}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                + New Folder
              </Button>
            </div>
          )}
        </div>

        {activeLease && tenantData.property && folders.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={folderFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setFolderFilter('all')}
            >
              All
            </Button>
            <Button
              type="button"
              size="sm"
              variant={folderFilter === 'uncategorized' ? 'default' : 'outline'}
              onClick={() => setFolderFilter('uncategorized')}
            >
              Uncategorized
            </Button>
            {folders.map(f => (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant={folderFilter === f.id ? 'default' : 'outline'}
                onClick={() => setFolderFilter(f.id)}
              >
                {f.name}
              </Button>
            ))}
          </div>
        )}

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
                  <div className="grid gap-2 grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Visibility</p>
                      <select
                        value={uploadVisibility}
                        onChange={e =>
                          setUploadVisibility(e.target.value as DocumentVisibility)
                        }
                        disabled={uploading}
                        className={selectClass}
                        aria-label="Visibility for new upload"
                      >
                        {DOCUMENT_VISIBILITY_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Category (optional)</p>
                      <select
                        value={categoryOption}
                        onChange={e => setCategoryOption(e.target.value)}
                        disabled={uploading}
                        className={selectClass}
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
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Choose file
                    </Button>
                    {uploading && (
                      <span className="text-sm text-muted-foreground">Uploading...</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {displayDocuments.length === 0 ? (
          <EmptyState
            icon={<File className="h-8 w-8" />}
            title={documents.length === 0 ? 'No documents available' : 'No documents in this folder'}
            description={
              documents.length === 0
                ? 'Documents will appear here when your landlord uploads them for your lease.'
                : 'Try another folder or choose All.'
            }
          />
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {displayDocuments.map(document => (
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
                          <p className="text-xs text-muted-foreground mb-1">Visibility</p>
                          <select
                            value={document.visibility}
                            onChange={e =>
                              void handleVisibilityChange(
                                document.id,
                                e.target.value as DocumentVisibility
                              )
                            }
                            disabled={visibilitySavingId === document.id}
                            className={selectClass}
                            aria-label={`Visibility for ${document.file_name}`}
                          >
                            {DOCUMENT_VISIBILITY_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
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
