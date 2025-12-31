import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'

export type TaskAssignedToType = 'tenant' | 'household' | 'unit'
export type TaskContextType = 'work_order' | 'move_in' | 'property' | 'rent_record'
export type TaskStatus = 'pending' | 'completed'

export interface Task {
  id: string
  title: string
  assigned_to_type: TaskAssignedToType
  assigned_to_id: string
  status: TaskStatus
  deadline: string | null
  linked_context_type: TaskContextType
  linked_context_id: string
  checklist_items: Array<{ id: string; text: string; completed: boolean }>
  image_urls: string[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface TaskInsert {
  title: string
  assigned_to_type: TaskAssignedToType
  assigned_to_id: string
  status?: TaskStatus
  deadline?: string | null
  linked_context_type: TaskContextType
  linked_context_id: string
  checklist_items?: Array<{ id: string; text: string; completed: boolean }>
  image_urls?: string[]
}

export interface TaskUpdate {
  title?: string
  status?: TaskStatus
  deadline?: string | null
  checklist_items?: Array<{ id: string; text: string; completed: boolean }>
  image_urls?: string[]
}

export function useTasks(contextType?: TaskContextType, contextId?: string) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (user) {
      fetchTasks()
    } else {
      setTasks([])
      setLoading(false)
    }
  }, [contextType, contextId, user])

  async function fetchTasks() {
    if (!user) return

    try {
      setLoading(true)
      let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })

      if (contextType && contextId) {
        query = query.eq('linked_context_type', contextType).eq('linked_context_id', contextId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setTasks((data || []) as Task[])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function createTask(task: TaskInsert) {
    if (!user) return { data: null, error: new Error('User not authenticated') }

    try {
      const { data: newTask, error: createError } = await supabase
        .from('tasks')
        .insert({
          ...task,
          created_by: user.id,
          checklist_items: task.checklist_items || [],
          image_urls: task.image_urls || [],
          status: task.status || 'pending',
        })
        .select()
        .single()

      if (createError) throw createError

      setTasks(prev => [newTask as Task, ...prev])
      return { data: newTask as Task, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  async function updateTask(id: string, updates: TaskUpdate) {
    try {
      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      setTasks(prev => prev.map(t => (t.id === id ? (updatedTask as Task) : t)))
      return { data: updatedTask as Task, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  async function deleteTask(id: string) {
    try {
      const { error: deleteError } = await supabase.from('tasks').delete().eq('id', id)

      if (deleteError) throw deleteError

      setTasks(prev => prev.filter(t => t.id !== id))
      return { error: null }
    } catch (err) {
      const error = err as Error
      return { error }
    }
  }

  async function toggleTaskStatus(id: string) {
    const task = tasks.find(t => t.id === id)
    if (!task) return { data: null, error: new Error('Task not found') }

    const newStatus: TaskStatus = task.status === 'pending' ? 'completed' : 'pending'
    return updateTask(id, { status: newStatus })
  }

  async function updateChecklistItem(taskId: string, itemId: string, completed: boolean) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return { data: null, error: new Error('Task not found') }

    const updatedChecklist = task.checklist_items.map(item =>
      item.id === itemId ? { ...item, completed } : item
    )

    return updateTask(taskId, { checklist_items: updatedChecklist })
  }

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    updateChecklistItem,
    refetch: fetchTasks,
  }
}

// Hook for tasks assigned to a specific tenant
export function useTenantTasks(tenantId?: string) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (tenantId && user) {
      fetchTenantTasks()
    } else {
      setTasks([])
      setLoading(false)
    }
  }, [tenantId, user])

  async function fetchTenantTasks() {
    if (!tenantId || !user) return

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to_type', 'tenant')
        .eq('assigned_to_id', tenantId)
        .order('deadline', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setTasks((data || []) as Task[])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return {
    tasks,
    loading,
    error,
    refetch: fetchTenantTasks,
  }
}
