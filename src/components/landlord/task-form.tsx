import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTenants } from '@/hooks/use-tenants'
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'
import type { TaskInsert, TaskUpdate, TaskAssignedToType, TaskContextType } from '@/hooks/use-tasks'
import { Plus, X, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface TaskFormProps {
  onSubmit: (data: TaskInsert | TaskUpdate) => Promise<{ data: any; error: Error | null }>
  onCancel?: () => void
  initialData?: TaskInsert & { id?: string }
  contextType: TaskContextType
  contextId: string
  loading?: boolean
}

export function TaskForm({
  onSubmit,
  onCancel,
  initialData,
  contextType,
  contextId,
  loading = false,
}: TaskFormProps) {
  const { tenants } = useTenants()
  const [title, setTitle] = useState(initialData?.title || '')
  const [assignedToType, setAssignedToType] = useState<TaskAssignedToType>(
    initialData?.assigned_to_type || 'tenant'
  )
  const [assignedToId, setAssignedToId] = useState(initialData?.assigned_to_id || '')
  const [deadline, setDeadline] = useState(initialData?.deadline || '')
  const [checklistItems, setChecklistItems] = useState<
    Array<{ id: string; text: string; completed: boolean }>
  >(initialData?.checklist_items || [])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const buttonSpring = createSpring('button')

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return
    setChecklistItems([
      ...checklistItems,
      { id: Date.now().toString(), text: newChecklistItem.trim(), completed: false },
    ])
    setNewChecklistItem('')
  }

  const handleRemoveChecklistItem = (id: string) => {
    setChecklistItems(checklistItems.filter(item => item.id !== id))
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const uploadPromises = Array.from(files).map(async file => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `task-images/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('documents').getPublicUrl(filePath)

        return data.publicUrl
      })

      const urls = await Promise.all(uploadPromises)
      setImageFiles([...imageFiles, ...Array.from(files)])
      // Note: Image URLs will be added to task on submit
    } catch (err) {
      setError('Failed to upload images')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!assignedToId) {
      setError('Assigned to is required')
      return
    }

    // Upload images and get URLs
    let imageUrls: string[] = []
    if (imageFiles.length > 0) {
      setUploading(true)
      try {
        const uploadPromises = imageFiles.map(async file => {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Math.random()}.${fileExt}`
          const filePath = `task-images/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file)

          if (uploadError) throw uploadError

          const { data } = supabase.storage.from('documents').getPublicUrl(filePath)

          return data.publicUrl
        })

        imageUrls = await Promise.all(uploadPromises)
      } catch (err) {
        setError('Failed to upload images')
        setUploading(false)
        return
      }
      setUploading(false)
    }

    const taskData: TaskInsert | TaskUpdate = {
      ...(initialData?.id ? { id: initialData.id } : {}),
      title: title.trim(),
      assigned_to_type: assignedToType,
      assigned_to_id: assignedToId,
      deadline: deadline || null,
      linked_context_type: contextType,
      linked_context_id: contextId,
      checklist_items: checklistItems,
      image_urls: imageUrls,
      ...(initialData?.id ? {} : { status: 'pending' }),
    }

    const result = await onSubmit(taskData)

    if (result.error) {
      setError(result.error.message)
    } else if (!initialData) {
      // Reset form if creating new task
      setTitle('')
      setAssignedToType('tenant')
      setAssignedToId('')
      setDeadline('')
      setChecklistItems([])
      setImageFiles([])
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      transition={{
        duration: motionTokens.duration.normal,
        ease: motionTokens.easing.standard,
      }}
      className="space-y-4"
    >
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium text-foreground">
          Title *
        </label>
        <Input
          id="title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Task title"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="assignedToType" className="text-sm font-medium text-foreground">
          Assign To
        </label>
        <select
          id="assignedToType"
          value={assignedToType}
          onChange={e => {
            setAssignedToType(e.target.value as TaskAssignedToType)
            setAssignedToId('')
          }}
          className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="tenant" className="text-foreground">
            Tenant
          </option>
          <option value="household" className="text-foreground">
            Household
          </option>
          <option value="unit" className="text-foreground">
            Unit
          </option>
        </select>
      </div>

      {assignedToType === 'tenant' && (
        <div className="space-y-2">
          <label htmlFor="assignedToId" className="text-sm font-medium text-foreground">
            Tenant *
          </label>
          <select
            id="assignedToId"
            value={assignedToId}
            onChange={e => setAssignedToId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            <option value="" className="text-foreground">
              Select tenant
            </option>
            {tenants.map(tenant => (
              <option key={tenant.id} value={tenant.id} className="text-foreground">
                {tenant.user?.email || `Tenant ${tenant.id.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="deadline" className="text-sm font-medium text-foreground">
          Deadline (optional)
        </label>
        <Input
          id="deadline"
          type="date"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Checklist Items (optional)</label>
        <div className="space-y-2">
          {checklistItems.map(item => (
            <div key={item.id} className="flex items-center gap-2">
              <Input value={item.text} readOnly className="flex-1" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveChecklistItem(item.id)}
                aria-label="Remove item"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newChecklistItem}
              onChange={e => setNewChecklistItem(e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddChecklistItem()
                }
              }}
              placeholder="Add checklist item"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddChecklistItem}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="images" className="text-sm font-medium text-foreground">
          Images (optional, for documentation purposes)
        </label>
        <Input
          id="images"
          type="file"
          accept="image/*"
          multiple
          onChange={e => handleImageUpload(e.target.files)}
          disabled={uploading}
        />
        {imageFiles.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {imageFiles.length} image{imageFiles.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading || uploading} className="flex-1">
          {loading || uploading ? 'Saving...' : initialData?.id ? 'Update Task' : 'Create Task'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading || uploading}
          >
            Cancel
          </Button>
        )}
      </div>
    </motion.form>
  )
}
