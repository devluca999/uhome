import { useState } from 'react'
import { motion } from 'framer-motion'
import { GripVertical, Eye, EyeOff } from 'lucide-react'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'

interface NavItem {
  path: string
  label: string
  required?: boolean
}

interface NavItemReorderProps {
  items: NavItem[]
  hiddenItems: string[]
  itemOrder: string[]
  onToggleVisibility: (path: string, hidden: boolean) => void
  onReorder: (newOrder: string[]) => void
}

export function NavItemReorder({
  items,
  hiddenItems,
  itemOrder,
  onToggleVisibility,
  onReorder,
}: NavItemReorderProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Use custom order if available, otherwise use original order
  const orderedItems =
    itemOrder.length > 0
      ? itemOrder
          .map(path => items.find(item => item.path === path))
          .filter((item): item is NavItem => item !== undefined)
          .concat(items.filter(item => !itemOrder.includes(item.path)))
      : items

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newOrder = [...orderedItems]
    const [draggedItem] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(dropIndex, 0, draggedItem)

    const newOrderPaths = newOrder.map(item => item.path)
    onReorder(newOrderPaths)

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="space-y-2">
      {orderedItems.map((item, index) => {
        const isHidden = hiddenItems.includes(item.path)
        const isRequired = item.required || item.path.includes('dashboard')

        return (
          <motion.div
            key={item.path}
            draggable={!isRequired}
            onDragStart={() => handleDragStart(index)}
            onDragOver={e => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            initial={{ opacity: motionTokens.opacity.visible }}
            animate={{
              opacity: draggedIndex === index ? 0.5 : motionTokens.opacity.visible,
            }}
            className={cn(
              'flex items-center gap-3 p-3 rounded-md border border-border bg-card',
              draggedIndex === index && 'cursor-grabbing',
              dragOverIndex === index && draggedIndex !== index && 'border-primary bg-primary/5',
              isHidden && 'opacity-60'
            )}
          >
            {!isRequired && (
              <GripVertical
                className={cn(
                  'w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing',
                  draggedIndex === index && 'cursor-grabbing'
                )}
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                {isRequired && <span className="text-xs text-muted-foreground">(Required)</span>}
              </div>
              <span className="text-xs text-muted-foreground">{item.path}</span>
            </div>
            <div className="flex items-center gap-2">
              {isHidden ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
              <Switch
                checked={!isHidden}
                onCheckedChange={checked => onToggleVisibility(item.path, !checked)}
                disabled={isRequired}
                aria-label={`${isHidden ? 'Show' : 'Hide'} ${item.label}`}
              />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
