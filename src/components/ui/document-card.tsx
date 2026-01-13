import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { File, Download } from 'lucide-react'
import type { Database } from '@/types/database'

type Document = Database['public']['Tables']['documents']['Row']

interface DocumentCardProps {
  document: Document
  readOnly?: boolean
  onDelete?: (id: string) => void
}

export function DocumentCard({ document, readOnly = false, onDelete }: DocumentCardProps) {
  return (
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
              <p className="text-sm font-medium text-foreground">{document.file_type}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(document.file_url, '_blank')}
              aria-label={`Download ${document.file_name}`}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            {!readOnly && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(document.id)}
                aria-label={`Delete ${document.file_name}`}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

