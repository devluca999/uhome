import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription'
import { isDevModeActive } from '@/lib/tenant-dev-mode'
import { trackUpload } from '@/hooks/admin/use-upload-monitoring'

type Document = {
  id: string
  property_id: string
  lease_id: string | null
  uploaded_by: string
  file_url: string
  file_name: string
  file_type?: string
  created_at: string
}

export function useDocuments(leaseId?: string, propertyId?: string) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [leaseId, propertyId])

  async function fetchDocuments() {
    try {
      setLoading(true)
      let query = supabase.from('documents').select('*').order('created_at', { ascending: false })

      // If leaseId is provided, filter by it
      if (leaseId) {
        query = query.eq('lease_id', leaseId)
      } else if (propertyId) {
        // If propertyId is provided, get all documents for this property (including lease-scoped ones)
        query = query.eq('property_id', propertyId)
      }
      // Otherwise fetch all (RLS will handle access)

      const { data, error } = await query

      if (error) throw error
      setDocuments(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  // Set up realtime subscription for multi-tab sync (dev mode only)
  // Note: Documents table changes, not storage bucket changes
  useRealtimeSubscription({
    table: 'documents',
    filter: leaseId ? { lease_id: leaseId } : propertyId ? { property_id: propertyId } : undefined,
    events: ['INSERT', 'UPDATE', 'DELETE'],
    onInsert: payload => {
      if (payload.new) {
        setDocuments(prev => {
          // Check if already exists
          if (prev.some(d => d.id === payload.new.id)) {
            return prev
          }
          return [payload.new as Document, ...prev]
        })
      }
    },
    onUpdate: payload => {
      if (payload.new) {
        setDocuments(prev =>
          prev.map(d => (d.id === payload.new.id ? (payload.new as Document) : d))
        )
      }
    },
    onDelete: payload => {
      if (payload.old) {
        const oldId = (payload.old as { id?: string }).id
        if (oldId) {
          setDocuments(prev => prev.filter(d => d.id !== oldId))
        }
      }
    },
  })

  async function uploadDocument(file: File, leaseId?: string, propertyId?: string) {
    // Property ID is required for all uploads
    if (!propertyId) {
      throw new Error('Property ID is required for document uploads')
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const pathPrefix = leaseId || propertyId
    const filePath = `${pathPrefix}/${fileName}`

    // Add dev mode metadata if in dev mode
    const devModeActive = isDevModeActive()
    const metadata = devModeActive
      ? {
          dev_mode: 'true',
          role: devModeActive,
          entity_type: leaseId ? 'lease' : 'property',
          entity_id: leaseId || propertyId,
        }
      : undefined

    // Track upload with monitoring
    const { result: publicUrl, error: uploadError } = await trackUpload(
      async () => {
        // Upload to Supabase Storage (assuming a bucket named 'documents')
        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            metadata,
          })

        if (uploadErr) throw uploadErr

        // Get public URL
        const {
          data: { publicUrl: url },
        } = supabase.storage.from('documents').getPublicUrl(filePath)

        return url
      },
      {
        bucket: 'documents',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      }
    )

    if (uploadError) throw uploadError

    // Create document record
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('documents')
      .insert({
        lease_id: leaseId || null,
        property_id: propertyId, // Required
        uploaded_by: user.id,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
      })
      .select('*')
      .single()

    if (error) throw error

    setDocuments([data, ...documents])
    return data
  }

  async function deleteDocument(id: string, fileUrl: string) {
    // Extract file path from URL
    const urlParts = fileUrl.split('/')
    const filePath = urlParts.slice(-2).join('/')

    // Delete from storage
    const { error: storageError } = await supabase.storage.from('documents').remove([filePath])

    if (storageError && storageError.message !== 'Object not found') {
      console.warn('Error deleting from storage:', storageError)
    }

    // Delete document record
    const { error } = await supabase.from('documents').delete().eq('id', id)

    if (error) throw error
    setDocuments(documents.filter(d => d.id !== id))
  }

  return {
    documents,
    loading,
    error,
    uploadDocument,
    deleteDocument,
    refetch: fetchDocuments,
  }
}
