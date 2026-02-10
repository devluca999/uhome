import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { Upload, FileText, X, Check, AlertCircle } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { ingestLeads, type RawLead } from '@/lib/leads/ingestion-pipeline'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function LeadUpload() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<RawLead[]>([])
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<RawLead[]>([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    imported: number
    duplicates: number
    errors: number
  } | null>(null)

  const enabled = isFeatureEnabled('ENABLE_MANUAL_LEAD_UPLOAD')

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (selectedFile.size > MAX_FILE_SIZE) {
      alert('File size exceeds 10MB limit')
      return
    }

    setFile(selectedFile)
    await parseFile(selectedFile)
  }

  async function parseFile(file: File) {
    try {
      const text = await file.text()
      let data: RawLead[] = []

      if (file.name.endsWith('.csv')) {
        data = parseCSV(text)
      } else if (file.name.endsWith('.json')) {
        data = JSON.parse(text)
      } else {
        alert('Unsupported file format. Please use CSV or JSON.')
        return
      }

      setParsedData(data)
      setPreview(data.slice(0, 10)) // Show first 10 rows

      // Auto-detect field mapping
      if (data.length > 0) {
        const autoMapping = autoDetectMapping(data[0])
        setFieldMapping(autoMapping)
      }
    } catch (error) {
      console.error('Error parsing file:', error)
      alert('Failed to parse file. Please check the format.')
    }
  }

  function parseCSV(text: string): RawLead[] {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) return []

    const headers = lines[0].split(',').map(h => h.trim())
    const rows: RawLead[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || null
      })
      rows.push(row as RawLead)
    }

    return rows
  }

  function autoDetectMapping(firstRow: RawLead): Record<string, string> {
    const mapping: Record<string, string> = {}
    const fieldNames = Object.keys(firstRow)

    // Common field name patterns
    const patterns: Record<string, string[]> = {
      email: ['email', 'e-mail', 'email_address', 'e_mail'],
      name: ['name', 'full_name', 'fullname', 'contact_name'],
      phone: ['phone', 'phone_number', 'phoneNumber', 'tel', 'mobile'],
      company: ['company', 'company_name', 'organization', 'org'],
    }

    Object.entries(patterns).forEach(([targetField, possibleNames]) => {
      const match = fieldNames.find(field =>
        possibleNames.some(pattern => field.toLowerCase().includes(pattern.toLowerCase()))
      )
      if (match) {
        mapping[targetField] = match
      }
    })

    return mapping
  }

  async function handleUpload() {
    if (!file || !user || parsedData.length === 0) return

    try {
      setUploading(true)
      setResult(null)

      const uploadResult = await ingestLeads(parsedData, {
        source: 'manual_upload',
        actorId: user.id,
        environment: 'production', // TODO: Detect from environment
        sandboxMode: false,
        autoEnrollWaitlist: false, // TODO: Add UI toggle
        autoEnrollNewsletter: false, // TODO: Add UI toggle
        fieldMapping,
      })

      setResult({
        success: uploadResult.success,
        imported: uploadResult.imported,
        duplicates: uploadResult.duplicates,
        errors: uploadResult.errors,
      })

      if (uploadResult.success) {
        // Navigate back to leads list after delay
        setTimeout(() => {
          navigate('/admin/leads')
        }, 3000)
      }
    } catch (error) {
      console.error('Error uploading leads:', error)
      alert('Failed to upload leads. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (!enabled) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <EmptyState
            icon={<Upload className="h-12 w-12" />}
            title="Manual upload disabled"
            description="Enable ENABLE_MANUAL_LEAD_UPLOAD feature flag to use this feature."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Upload Leads</h1>
            <p className="text-muted-foreground mt-1">
              Import leads from CSV or JSON files
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/leads')}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Select File</CardTitle>
            <CardDescription>
              Upload a CSV or JSON file (max 10MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileSelect}
                className="hidden"
              />
              {!file ? (
                <div>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Choose File
                  </Button>
                  <p className="text-sm text-muted-foreground mt-4">
                    Supported formats: CSV, JSON
                  </p>
                </div>
              ) : (
                <div>
                  <FileText className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <p className="font-medium text-foreground mb-2">{file.name}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {(file.size / 1024).toFixed(2)} KB • {parsedData.length} rows detected
                  </p>
                  <Button variant="outline" onClick={() => {
                    setFile(null)
                    setParsedData([])
                    setPreview([])
                    setFieldMapping({})
                  }}>
                    <X className="w-4 h-4 mr-2" />
                    Remove File
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Field Mapping */}
        {parsedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Field Mapping</CardTitle>
              <CardDescription>
                Map file columns to system fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['email', 'name', 'phone', 'company'].map(field => (
                  <div key={field} className="flex items-center gap-3">
                    <label className="w-24 text-sm font-medium text-foreground capitalize">
                      {field}:
                    </label>
                    <select
                      value={fieldMapping[field] || ''}
                      onChange={e => setFieldMapping({ ...fieldMapping, [field]: e.target.value })}
                      className="flex-1 h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="">-- Select column --</option>
                      {Object.keys(parsedData[0] || {}).map(col => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                    {field === 'email' && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Preview (First 10 rows)</CardTitle>
              <CardDescription>
                Review parsed data before importing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {Object.keys(preview[0] || {}).map(key => (
                        <th key={key} className="text-left p-2 font-medium text-foreground">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, index) => (
                      <tr key={index} className="border-b border-border">
                        {Object.values(row).map((value, i) => (
                          <td key={i} className="p-2 text-muted-foreground">
                            {String(value || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Button */}
        {parsedData.length > 0 && fieldMapping.email && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Ready to import {parsedData.length} leads
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Email mapping: {fieldMapping.email}
                  </p>
                </div>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Import Leads'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <Card className={result.success ? 'border-primary' : 'border-destructive'}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                {result.success ? (
                  <Check className="w-6 h-6 text-primary" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-destructive" />
                )}
                <h3 className="font-semibold text-foreground">
                  {result.success ? 'Import Complete' : 'Import Failed'}
                </h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Imported:</span>
                  <span className="font-medium text-foreground">{result.imported}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Duplicates:</span>
                  <span className="font-medium text-foreground">{result.duplicates}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Errors:</span>
                  <span className="font-medium text-destructive">{result.errors}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
