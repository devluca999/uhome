import { useState } from 'react'
import { useProperties } from '@/hooks/use-properties'
import { useDocuments } from '@/hooks/use-documents'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, File, X } from 'lucide-react'

export function LandlordDocuments() {
  const { properties } = useProperties()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const { documents, loading, uploadDocument, deleteDocument } = useDocuments(selectedPropertyId)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-stone-900">Documents</h1>
        <p className="text-stone-600 mt-1">Manage property documents</p>
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
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a property...</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
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
            <Card>
              <CardHeader>
                <CardTitle>Upload Document</CardTitle>
                <CardDescription>Upload a document for tenants to access</CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
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
                  {uploading && <span className="text-sm text-stone-600">Uploading...</span>}
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-stone-600">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <File className="mx-auto h-12 w-12 text-stone-400 mb-4" />
                <p className="text-stone-600">No documents yet</p>
                <p className="text-sm text-stone-500 mt-2">
                  Upload documents to share with tenants
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documents.map(document => (
                <Card key={document.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <File className="h-5 w-5 text-stone-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{document.file_name}</CardTitle>
                          <CardDescription className="mt-1">
                            {new Date(document.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(document.id, document.file_url)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(document.file_url, '_blank')}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      View/Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {!selectedPropertyId && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-600">Select a property to manage documents</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
