import { useTenantData } from '@/hooks/use-tenant-data'
import { useDocuments } from '@/hooks/use-documents'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, File } from 'lucide-react'

export function TenantDocuments() {
  const { data: tenantData, loading: tenantLoading } = useTenantData()
  const { documents, loading: documentsLoading } = useDocuments(tenantData?.property.id)

  if (tenantLoading || documentsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-stone-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!tenantData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-600">No property assigned</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-stone-900">Documents</h1>
        <p className="text-stone-600 mt-1">Access property documents</p>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <File className="mx-auto h-12 w-12 text-stone-400 mb-4" />
            <p className="text-stone-600">No documents available</p>
            <p className="text-sm text-stone-500 mt-2">
              Documents will appear here when your landlord uploads them
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map(document => (
            <Card key={document.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <File className="h-5 w-5 text-stone-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{document.file_name}</CardTitle>
                    {document.uploaded_by_user && (
                      <CardDescription className="mt-1">
                        Uploaded by {document.uploaded_by_user.email}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-stone-500">Uploaded</p>
                    <p className="text-sm font-medium">
                      {new Date(document.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {document.file_type && (
                    <div>
                      <p className="text-xs text-stone-500">Type</p>
                      <p className="text-sm font-medium">{document.file_type}</p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(document.file_url, '_blank')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
