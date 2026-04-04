import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription'
import { isDevModeActive } from '@/lib/tenant-dev-mode'
import { trackUpload } from '@/hooks/admin/use-upload-monitoring'
import type { DocumentVisibility } from '@/types/document-visibility'
import { parseDocumentVisibility } from '@/types/document-visibility'

export type Document = {
  id: string
  property_id: string
  lease_id: string | null
  uploaded_by: string
  file_url: string
  file_name: string
  file_type?: string
  created_at: string
  visibility: DocumentVisibility
  folder_id: string | null
}

export type DocumentFolder = {
  id: string
  property_id: string
  lease_id: string | null
  name: string
  created_by: string
  created_at: string
}

export type DocumentsViewerRole = 'tenant' | 'landlord'

export type UseDocumentsOptions = {
  viewer?: DocumentsViewerRole
}

/** Non-owners only see documents with visibility landlord or household. Uploader always sees their own. */
function filterVisibleDocuments(docs: Document[], userId: string): Document[] {
  return docs.filter(d => {
    if (d.uploaded_by === userId) return true
    const v = parseDocumentVisibility(d.visibility)
    return v === 'landlord' || v === 'household'
  })
}

function normalizeRow(row: Record<string, unknown>): Document {
  const r = row as Document
  return {
    ...r,
    visibility: parseDocumentVisibility(r.visibility as string | undefined),
    folder_id: (r.folder_id as string | null) ?? null,
  }
}

export function useDocuments(
  leaseId?: string,
  propertyId?: string,
  options?: UseDocumentsOptions
) {
  const [allDocuments, setAllDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<DocumentFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [viewerUserId, setViewerUserId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!options?.viewer) {
      setViewerUserId(undefined)
      return
    }
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) setViewerUserId(user?.id ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [options?.viewer])

  const documents = useMemo(() => {
    if (!options?.viewer) return allDocuments
    if (viewerUserId === undefined) return []
    if (viewerUserId === null) return []
    return filterVisibleDocuments(allDocuments, viewerUserId)
  }, [allDocuments, options?.viewer, viewerUserId])

  useEffect(() => {
    fetchDocuments()
  }, [leaseId, propertyId])

  useEffect(() => {
    fetchFolders()
  }, [leaseId, propertyId])

  async function fetchDocuments() {
    try {
      setLoading(true)
      let query = supabase.from('documents').select('*').order('created_at', { ascending: false })

      if (leaseId) {
        query = query.eq('lease_id', leaseId)
      } else if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      const { data, error: qError } = await query

      if (qError) throw qError
      setAllDocuments((data || []).map(row => normalizeRow(row as Record<string, unknown>)))
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchFolders() {
    try {
      if (!propertyId) {
        setFolders([])
        return
      }
      let query = supabase
        .from('document_folders')
        .select('*')
        .eq('property_id', propertyId)
        .order('name', { ascending: true })

      if (leaseId) {
        query = query.eq('lease_id', leaseId)
      }

      const { data, error: qError } = await query
      if (qError) throw qError
      setFolders((data || []) as DocumentFolder[])
    } catch {
      setFolders([])
    }
  }

  useRealtimeSubscription({
    table: 'documents',
    filter: leaseId ? { lease_id: leaseId } : propertyId ? { property_id: propertyId } : undefined,
    events: ['INSERT', 'UPDATE', 'DELETE'],
    onInsert: payload => {
      if (payload.new) {
        const doc = normalizeRow(payload.new as Record<string, unknown>)
        setAllDocuments(prev => {
          if (prev.some(d => d.id === doc.id)) return prev
          return [doc, ...prev]
        })
      }
    },
    onUpdate: payload => {
      if (payload.new) {
        const doc = normalizeRow(payload.new as Record<string, unknown>)
        setAllDocuments(prev => prev.map(d => (d.id === doc.id ? doc : d)))
      }
    },
    onDelete: payload => {
      if (payload.old) {
        const oldId = (payload.old as { id?: string }).id
        if (oldId) {
          setAllDocuments(prev => prev.filter(d => d.id !== oldId))
        }
      }
    },
  })

  async function uploadDocument(
    file: File,
    leaseIdArg?: string,
    propertyIdArg?: string,
    categoryLabel?: string,
    uploadOpts?: { visibility?: DocumentVisibility; folderId?: string | null }
  ) {
    const pid = propertyIdArg
    if (!pid) {
      throw new Error('Property ID is required for document uploads')
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const pathPrefix = leaseIdArg || pid
    const filePath = `${pathPrefix}/${fileName}`
    const displayName = categoryLabel ? `[${categoryLabel}] ${file.name}` : file.name

    const devModeActive = isDevModeActive()
    const metadata = devModeActive
      ? {
          dev_mode: 'true',
          role: devModeActive,
          entity_type: leaseIdArg ? 'lease' : 'property',
          entity_id: leaseIdArg || pid,
        }
      : undefined

    const { result: publicUrl, error: uploadError } = await trackUpload(
      async () => {
        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            metadata,
          })

        if (uploadErr) throw uploadErr

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

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const visibility = uploadOpts?.visibility ?? 'household'
    const folderId = uploadOpts?.folderId ?? null

    const { data, error: insertError } = await supabase
      .from('documents')
      .insert({
        lease_id: leaseIdArg || null,
        property_id: pid,
        uploaded_by: user.id,
        file_url: publicUrl,
        file_name: displayName,
        file_type: file.type,
        visibility,
        folder_id: folderId,
      })
      .select('*')
      .single()

    if (insertError) throw insertError

    const doc = normalizeRow(data as Record<string, unknown>)
    setAllDocuments(prev => [doc, ...prev])
    return doc
  }

  async function updateDocumentVisibility(documentId: string, visibility: DocumentVisibility) {
    const { data, error: upError } = await supabase
      .from('documents')
      .update({ visibility })
      .eq('id', documentId)
      .select('*')
      .single()

    if (upError) throw upError
    const doc = normalizeRow(data as Record<string, unknown>)
    setAllDocuments(prev => prev.map(d => (d.id === documentId ? doc : d)))
    return doc
  }

  async function createFolder(name: string) {
    const trimmed = name.trim()
    if (!trimmed) {
      throw new Error('Folder name is required')
    }
    if (!propertyId) {
      throw new Error('Property ID is required')
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error: insError } = await supabase
      .from('document_folders')
      .insert({
        property_id: propertyId,
        lease_id: leaseId ?? null,
        name: trimmed,
        created_by: user.id,
      })
      .select('*')
      .single()

    if (insError) throw insError
    const folder = data as DocumentFolder
    setFolders(prev => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)))
    return folder
  }

  async function deleteDocument(id: string, fileUrl: string) {
    const urlParts = fileUrl.split('/')
    const filePath = urlParts.slice(-2).join('/')

    const { error: storageError } = await supabase.storage.from('documents').remove([filePath])

    if (storageError && storageError.message !== 'Object not found') {
      console.warn('Error deleting from storage:', storageError)
    }

    const { error: delError } = await supabase.from('documents').delete().eq('id', id)

    if (delError) throw delError
    setAllDocuments(prev => prev.filter(d => d.id !== id))
  }

  const viewerAuthLoading = Boolean(options?.viewer && viewerUserId === undefined)

  return {
    documents,
    allDocuments,
    folders,
    loading: loading || viewerAuthLoading,
    error,
    uploadDocument,
    updateDocumentVisibility,
    createFolder,
    deleteDocument,
    refetch: fetchDocuments,
    refetchFolders: fetchFolders,
  }
}
