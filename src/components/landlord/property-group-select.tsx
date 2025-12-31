import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X } from 'lucide-react'
import { usePropertyGroups, usePropertyGroupAssignments } from '@/hooks/use-property-groups'
import { motion, AnimatePresence } from 'framer-motion'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface PropertyGroupSelectProps {
  propertyId?: string
  value?: string[]
  onChange?: (groupIds: string[]) => void
  disabled?: boolean
  className?: string
}

export function PropertyGroupSelect({
  propertyId,
  value,
  onChange,
  disabled,
  className,
}: PropertyGroupSelectProps) {
  const { groups, createGroup } = usePropertyGroups()
  const { assignments, setAssignments } = usePropertyGroupAssignments(propertyId)
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupType, setNewGroupType] = useState<'city' | 'ownership' | 'custom'>('custom')
  const [creating, setCreating] = useState(false)

  const selectedGroupIds = propertyId ? assignments : value || []

  const handleToggleGroup = async (groupId: string) => {
    if (disabled) return

    const isSelected = selectedGroupIds.includes(groupId)
    const newSelection = isSelected
      ? selectedGroupIds.filter(id => id !== groupId)
      : [...selectedGroupIds, groupId]

    if (propertyId) {
      await setAssignments(newSelection)
    } else if (onChange) {
      onChange(newSelection)
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return

    setCreating(true)
    const result = await createGroup({
      name: newGroupName.trim(),
      type: newGroupType,
    })

    setCreating(false)

    if (!result.error && result.data) {
      // Auto-select the newly created group
      const newSelection = [...selectedGroupIds, result.data.id]
      if (propertyId) {
        await setAssignments(newSelection)
      } else if (onChange) {
        onChange(newSelection)
      }
      setShowAddGroup(false)
      setNewGroupName('')
      setNewGroupType('custom')
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-foreground">Grouping Labels</label>
      <div className="space-y-3">
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {groups.map(group => {
              const isSelected = selectedGroupIds.includes(group.id)
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleToggleGroup(group.id)}
                  disabled={disabled}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {group.name}
                  {isSelected && <X className="w-3 h-3" />}
                </button>
              )
            })}
          </div>
        )}

        {!showAddGroup ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddGroup(true)}
            disabled={disabled}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add New Group
          </Button>
        ) : (
          <AnimatePresence initial={false}>
            <motion.div
              initial={{ opacity: 0, maxHeight: 0 }}
              animate={{ opacity: 1, maxHeight: 300 }}
              exit={{ opacity: 0, maxHeight: 0 }}
              transition={{
                duration: durationToSeconds(motionTokens.duration.base),
                ease: motionTokens.ease.standard,
              }}
              style={{ overflow: 'hidden' }}
              className="space-y-2 p-3 border border-border rounded-md bg-card"
              layout={false}
            >
              <Input
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="Group name"
                disabled={disabled || creating}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreateGroup()
                  } else if (e.key === 'Escape') {
                    setShowAddGroup(false)
                    setNewGroupName('')
                  }
                }}
                autoFocus
              />
              <select
                value={newGroupType}
                onChange={e => setNewGroupType(e.target.value as 'city' | 'ownership' | 'custom')}
                disabled={disabled || creating}
                className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="city" className="text-foreground">
                  City
                </option>
                <option value="ownership" className="text-foreground">
                  Ownership
                </option>
                <option value="custom" className="text-foreground">
                  Custom
                </option>
              </select>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateGroup}
                  disabled={disabled || creating || !newGroupName.trim()}
                  className="text-xs"
                >
                  {creating ? 'Creating...' : 'Create'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddGroup(false)
                    setNewGroupName('')
                    setNewGroupType('custom')
                  }}
                  disabled={disabled || creating}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
