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

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setNotes(data || [])
    } catch (err) {
      setError(err as Error)
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
