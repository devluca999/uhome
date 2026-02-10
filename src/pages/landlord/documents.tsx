import { useState } from 'react'
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
import { Upload, File, X, FileText, ChevronUp } from 'lucide-react'
import { motion as motionTokens, createSpring } from '@/lib/motion'

export function LandlordDocuments() {
  const { properties } = useProperties()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const { documents, loading, uploadDocument, deleteDocument } = useDocuments(selectedPropertyId)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedDocumentId, setExpandedDocumentId] = useState<string | null>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedPropertyId) return

    setError(null)
    setUploading(true)

    try {
      await uploadDocument(file, selectedPropertyId)
      e.target.value = '' // Reset input
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document')
    } finally {
      setUploading(false)
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
    <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
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
                onChange={e => setSelectedPropertyId(e.target.value)}
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
            <div className="mb-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Upload Document</CardTitle>
                  <CardDescription>Upload a document for tenants to access</CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="mb-4 p-3 text-sm text-destructive bg-destructive/20 rounded-md border border-destructive/30">
                      {error}
                    </div>
                  )}
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
                </CardContent>
              </Card>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <EmptyState
                icon={<File className="h-8 w-8" />}
                title="No documents yet"
                description="Upload documents such as leases, contracts, or guides to share with tenants."
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
