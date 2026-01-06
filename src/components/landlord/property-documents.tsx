import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Image, FileCheck, Plus } from 'lucide-react'
import { useDocuments } from '@/hooks/use-documents'
import { useLeases } from '@/hooks/use-leases'

interface PropertyDocumentsProps {
  propertyId: string
}

export function PropertyDocuments({ propertyId }: PropertyDocumentsProps) {
  const { documents, loading } = useDocuments(undefined, propertyId)
  const { leases } = useLeases(propertyId)

  // Filter documents by type
  const leaseDocuments = documents.filter(d => d.lease_id !== null)
  const propertyDocuments = documents.filter(
    d => d.lease_id === null && d.property_id === propertyId
  )
  const imageDocuments = documents.filter(
    d => d.file_type?.startsWith('image/') && d.property_id === propertyId
  )

  return (
    <div className="space-y-6">
      {/* Leases Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Leases
            </h3>
            <p className="text-sm text-muted-foreground">
              Documents associated with leases for this property
            </p>
          </div>
        </div>
        {leaseDocuments.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No lease documents</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {leaseDocuments.map(doc => (
              <Card key={doc.id} className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Images Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Image className="w-5 h-5" />
              Images
            </h3>
            <p className="text-sm text-muted-foreground">
              Move-in/move-out condition proof, damage reports, maintenance documentation
            </p>
          </div>
        </div>
        {imageDocuments.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No images uploaded</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {imageDocuments.map(doc => (
              <Card key={doc.id} className="glass-card aspect-square overflow-hidden">
                <CardContent className="p-0">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={doc.file_url}
                      alt={doc.file_name}
                      className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                    />
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Other Documents Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Other Documents
            </h3>
            <p className="text-sm text-muted-foreground">General property documents</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
        {propertyDocuments.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No documents uploaded</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {propertyDocuments.map(doc => (
              <Card key={doc.id} className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
