import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

type Document = {
  id: string
  property_id: string
  uploaded_by: string
  file_url: string
  file_name: string
  file_type?: string
  created_at: string
  uploaded_by_user?: {
    email: string
  }
}

export function useDocuments(propertyId?: string) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [propertyId])

  async function fetchDocuments() {
    try {
      setLoading(true)
      let query = supabase
        .from('documents')
        .select(
          `
          *,
          uploaded_by_user:users(email)
        `
        )
        .order('created_at', { ascending: false })

      // If propertyId is provided, filter by it; otherwise fetch all
      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      const { data, error } = await query

      if (error) throw error
      setDocuments(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function uploadDocument(file: File, propertyId: string) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${propertyId}/${fileName}`

    // Upload to Supabase Storage (assuming a bucket named 'documents')
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file)

    if (uploadError) throw uploadError

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('documents').getPublicUrl(filePath)

    // Create document record
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('documents')
      .insert({
        property_id: propertyId,
        uploaded_by: user.id,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
      })
      .select(
        `
          *,
          uploaded_by_user:users(email)
        `
      )
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
