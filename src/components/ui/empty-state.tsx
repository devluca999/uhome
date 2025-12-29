import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn('glass-card border-dashed', className)}>
      <CardContent className="py-12 text-center">
        {icon && (
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center text-stone-400">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold text-stone-900 mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-stone-600 mb-4 max-w-sm mx-auto">{description}</p>
        )}
        {action && (
          <Button onClick={action.onClick} variant="default">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
