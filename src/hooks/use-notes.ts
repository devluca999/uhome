import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import type { Database } from '@/types/database'

type Note = Database['public']['Tables']['notes']['Row']
type NoteInsert = Database['public']['Tables']['notes']['Insert']
type NoteUpdate = Database['public']['Tables']['notes']['Update']

export type NoteEntityType =
  | 'property'
  | 'unit'
  | 'tenant'
  | 'rent_record'
  | 'expense'
  | 'work_order'
  | 'document'

export function useNotes(entityType: NoteEntityType, entityId?: string) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (entityId && user) {
      fetchNotes()
    } else {
      setNotes([])
      setLoading(false)
    }
  }, [entityType, entityId, user])

  async function fetchNotes() {
    if (!entityId || !user) return

    // Skip fetching notes for fallback IDs (client-side generated records that don't exist in DB)
    if (entityId.startsWith('fallback-')) {
      setNotes([])
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Handle errors gracefully - 404s and missing tables should return empty array
      if (fetchError) {
        const errorMessage = fetchError.message?.toLowerCase() || ''
        const errorCode = fetchError.code || ''

        // Check for 404, missing table, or relation doesn't exist errors
        const isNotFoundError =
          errorCode === 'PGRST116' ||
          errorCode === '42P01' ||
          errorMessage.includes('404') ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('relation') ||
          errorMessage.includes('not found')

        if (isNotFoundError) {
          // Return empty array for not found errors (table might not exist or no notes found)
          setNotes([])
          setError(null)
        } else {
          // For other errors, log but don't break the UI
          console.warn('Error fetching notes:', fetchError)
          setNotes([])
          setError(null)
        }
      } else {
        setNotes(data || [])
        setError(null)
      }
    } catch (err) {
      // Catch any unexpected errors and handle gracefully
      const error = err as Error
      const errorMessage = error.message?.toLowerCase() || ''

      if (
        errorMessage.includes('404') ||
        errorMessage.includes('does not exist') ||
        errorMessage.includes('not found')
      ) {
        setNotes([])
        setError(null)
      } else {
        console.warn('Unexpected error fetching notes:', error)
        setNotes([])
        setError(null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function createNote(content: string) {
    if (!entityId || !user) return { data: null, error: new Error('Missing entity ID or user') }

    try {
      const { data: newNote, error: createError } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          content: content.trim(),
        })
        .select()
        .single()

      if (createError) throw createError

      setNotes(prev => [newNote, ...prev])
      return { data: newNote, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  async function updateNote(id: string, content: string) {
    try {
      const { data: updatedNote, error: updateError } = await supabase
        .from('notes')
        .update({ content: content.trim() })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      setNotes(prev => prev.map(n => (n.id === id ? updatedNote : n)))
      return { data: updatedNote, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  async function deleteNote(id: string) {
    try {
      const { error: deleteError } = await supabase.from('notes').delete().eq('id', id)

      if (deleteError) throw deleteError

      setNotes(prev => prev.filter(n => n.id !== id))
      return { error: null }
    } catch (err) {
      const error = err as Error
      return { error }
    }
  }

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes,
  }
}
