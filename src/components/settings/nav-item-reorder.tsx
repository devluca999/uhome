import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { GripVertical } from 'lucide-react'
import { motionTokens } from '@/lib/motion'
import { cn } from '@/lib/utils'

const SCROLL_ZONE = 80
const SCROLL_SPEED = 12

interface NavItem {
  path: string
  label: string
  required?: boolean
}

interface NavItemReorderProps {
  items: NavItem[]
  itemOrder: string[]
  onReorder: (newOrder: string[]) => void
}

export function NavItemReorder({
  items,
  itemOrder,
  onReorder,
}: NavItemReorderProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleContainerDragOver = useCallback(
    (e: React.DragEvent) => {
      if (draggedIndex === null) return
      e.preventDefault()
      const container = scrollRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const y = e.clientY - rect.top
      if (y < SCROLL_ZONE && container.scrollTop > 0) {
        container.scrollTop = Math.max(0, container.scrollTop - SCROLL_SPEED)
      } else if (y > rect.height - SCROLL_ZONE && container.scrollTop < container.scrollHeight - container.clientHeight) {
        container.scrollTop = Math.min(
          container.scrollHeight - container.clientHeight,
          container.scrollTop + SCROLL_SPEED
        )
      }
    },
    [draggedIndex]
  )

  // Use custom order if available, otherwise use original order
  const orderedItems =
    itemOrder.length > 0
      ? itemOrder
          .map(path => items.find(item => item.path === path))
          .filter((item): item is NavItem => item !== undefined)
          .concat(items.filter(item => !itemOrder.includes(item.path)))
      : items

  const handleDragStart = (index: number, element: HTMLElement) => {
    setDraggedIndex(index)
    // Scroll item into view if it's near the bottom
    setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }, 0)
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

  // Show entire list without scroll for easy reordering (landlord: 6–8 items, tenant: 3–4)
  const hasScrollableContent = orderedItems.length > 10

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onDragOver={handleContainerDragOver}
        className={cn(
          'rounded-lg border border-border space-y-2 pr-1',
          hasScrollableContent ? 'max-h-[min(560px,75vh)] overflow-y-scroll' : 'overflow-visible'
        )}
        style={
          hasScrollableContent
            ? { scrollbarGutter: 'stable' }
            : undefined
        }
      >
        {orderedItems.map((item, index) => {
        const isRequired = item.required || item.path.includes('dashboard')

        return (
          <motion.div
            key={item.path}
            draggable={!isRequired}
            onDragStart={e => {
              handleDragStart(index, e.currentTarget as HTMLElement)
            }}
            onDragOver={e => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            initial={{ opacity: motionTokens.opacity.visible }}
            animate={{
              opacity: draggedIndex === index ? 0.7 : motionTokens.opacity.visible,
            }}
            className={cn(
              'flex items-center gap-3 p-3 rounded-md border border-border bg-card scroll-m-2',
              draggedIndex === index && 'cursor-grabbing z-10',
              dragOverIndex === index && draggedIndex !== index && 'border-primary bg-primary/5'
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
          </motion.div>
        )
      })}
      </div>
    </div>
  )
}
