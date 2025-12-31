import { motion, AnimatePresence } from 'framer-motion'
import { useTenantData } from '@/hooks/use-tenant-data'
import { useDocuments } from '@/hooks/use-documents'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Download, File } from 'lucide-react'
import { motion as motionTokens, createSpring } from '@/lib/motion'

export function TenantDocuments() {
  const { data: tenantData, loading: tenantLoading } = useTenantData()
  const { documents, loading: documentsLoading } = useDocuments(tenantData?.property.id)

  const cardSpring = createSpring('card')

  if (tenantLoading || documentsLoading) {
    return (
      <div className="container mx-auto px-4 py-8 relative">
        <GrainOverlay />
        <div className="text-center py-12 relative z-10">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!tenantData) {
    return (
      <div className="container mx-auto px-4 py-8 relative">
        <GrainOverlay />
        <Card className="relative z-10">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No property assigned</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-foreground mb-2">Documents</h1>
          <p className="text-muted-foreground">Access property documents</p>
        </div>

        {documents.length === 0 ? (
          <EmptyState
            icon={<File className="h-8 w-8" />}
            title="No documents available"
            description="Documents will appear here when your landlord uploads them for your property."
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
