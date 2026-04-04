import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProperties } from '@/hooks/use-properties'
import { useDocuments } from '@/hooks/use-documents'
import { NotesPanel } from '@/components/landlord/notes-panel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Upload, File, X, FileText, ChevronUp, FolderPlus, Plus } from 'lucide-react'
import { motion as motionTokens, createSpring } from '@/lib/motion'
import {
  DOCUMENT_VISIBILITY_OPTIONS,
  type DocumentVisibility,
} from '@/types/document-visibility'

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

type FolderFilter = 'all' | 'uncategorized' | string

export function LandlordDocuments() {
  const { properties } = useProperties()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [categoryOption, setCategoryOption] = useState<string>('')
  const [customCategory, setCustomCategory] = useState<string>('')
  const [uploadVisibility, setUploadVisibility] = useState<DocumentVisibility>('household')
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all')
  const [visibilitySavingId, setVisibilitySavingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    documents,
    folders,
    loading,
    uploadDocument,
    deleteDocument,
    updateDocumentVisibility,
    createFolder,
  } = useDocuments(undefined, selectedPropertyId || undefined, { viewer: 'landlord' })

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedDocumentId, setExpandedDocumentId] = useState<string | null>(null)

  const displayDocuments = useMemo(() => {
    if (folderFilter === 'all') return documents
    if (folderFilter === 'uncategorized') return documents.filter(d => !d.folder_id)
    return documents.filter(d => d.folder_id === folderFilter)
  }, [documents, folderFilter])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedPropertyId) return

    setError(null)
    setUploading(true)

    try {
      const resolvedCategory =
        categoryOption === 'other' ? customCategory.trim() : categoryOption.trim()
      const folderId =
        folderFilter === 'all' || folderFilter === 'uncategorized' ? null : folderFilter
      await uploadDocument(file, undefined, selectedPropertyId, resolvedCategory || undefined, {
        visibility: uploadVisibility,
        folderId,
      })
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

  async function handleDelete(id: string, fileUrl: string) {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      await deleteDocument(id, fileUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
    }
  }

  const cardSpring = createSpring('card')

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
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-foreground mb-2">Documents</h1>
          <p className="text-muted-foreground">Manage property documents</p>
        </div>

        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Property</CardTitle>
              <CardDescription>Choose a property to manage documents</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={selectedPropertyId}
                onChange={e => {
                  setSelectedPropertyId(e.target.value)
                  setFolderFilter('all')
                }}
                className="flex h-10 w-full rounded-md border border-input bg-transparent text-foreground px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" className="text-foreground">
                  Select a property...
                </option>
                {properties.map(property => (
                  <option key={property.id} value={property.id} className="text-foreground">
                    {property.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        </div>

        {selectedPropertyId && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
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
              <Button type="button" variant="outline" size="sm" onClick={() => void handleNewFolder()}>
                <FolderPlus className="mr-2 h-4 w-4" />
                + New Folder
              </Button>
            </div>

            {folders.length > 0 && (
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

            <div className="mb-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Upload Document</CardTitle>
                  <CardDescription>
                    Upload a document for tenants and admin to access, with an optional category.
                  </CardDescription>
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
                          <option value="Inspection">Inspection</option>
                          <option value="Move-in / Move-out">Move-in / Move-out</option>
                          <option value="Notices">Notices</option>
                          <option value="Insurance">Insurance</option>
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
                          placeholder="e.g., HOA, Legal"
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

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading documents...</p>
              </div>
            ) : displayDocuments.length === 0 ? (
              <EmptyState
                icon={<File className="h-8 w-8" />}
                title={documents.length === 0 ? 'No documents yet' : 'No documents in this folder'}
                description={
                  documents.length === 0
                    ? 'Upload documents such as leases, contracts, or guides to share with tenants.'
                    : 'Try another folder or choose All.'
                }
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <File className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base truncate">
                                  {document.file_name}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  {new Date(document.created_at).toLocaleDateString()}
                                </CardDescription>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(document.id, document.file_url)}
                              className="text-destructive hover:text-destructive/90"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
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
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => window.open(document.file_url, '_blank')}
                              aria-label={`View or download ${document.file_name}`}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              View/Download
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={() =>
                                setExpandedDocumentId(
                                  expandedDocumentId === document.id ? null : document.id
                                )
                              }
                            >
                              {expandedDocumentId === document.id ? (
                                <>
                                  <ChevronUp className="mr-2 h-4 w-4" />
                                  Hide Notes
                                </>
                              ) : (
                                <>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Notes
                                </>
                              )}
                            </Button>
                          </div>
                          <AnimatePresence>
                            {expandedDocumentId === document.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{
                                  duration: motionTokens.duration.slow,
                                  ease: motionTokens.ease.standard,
                                }}
                                className="overflow-hidden mt-4 pt-4 border-t border-border"
                              >
                                <NotesPanel entityType="document" entityId={document.id} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {!selectedPropertyId && (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Select a property to manage documents</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
