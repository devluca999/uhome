import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { motionTokens, createSpring } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface IncomeCard {
  type: 'rent' | 'vacancy'
  label: string
  value: number
  subtext?: string
}

interface IncomeStreamProps {
  cards: IncomeCard[]
  onCardClick?: (type: 'rent' | 'vacancy') => void
  className?: string
}

export function IncomeStream({ cards, onCardClick, className }: IncomeStreamProps) {
  const cardSpring = createSpring('card')

  const formatCurrency = (value: number) => {
    return `$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  return (
    <div className={cn('overflow-x-auto pb-4', className)}>
      <div className="flex gap-4 min-w-max">
        {cards.map((card, index) => (
          <motion.div
            key={card.type}
            initial={{ opacity: motionTokens.opacity.hidden, x: 20 }}
            animate={{ opacity: motionTokens.opacity.visible, x: 0 }}
            whileHover={{ y: -2 }}
            transition={{
              type: 'spring',
              ...cardSpring,
              delay: index * 0.05,
            }}
            className="min-w-[200px]"
          >
            <Card
              className={cn(
                'glass-card',
                card.type === 'rent' && onCardClick && 'cursor-pointer',
                card.type === 'vacancy' && 'opacity-75'
              )}
              onClick={() => card.type === 'rent' && onCardClick?.(card.type)}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">{card.label}</span>
                  <p className="text-2xl font-semibold text-foreground">
                    {formatCurrency(card.value)}
                  </p>
                  {card.subtext && <p className="text-xs text-muted-foreground">{card.subtext}</p>}
                  {card.type === 'vacancy' && (
                    <p className="text-xs text-muted-foreground italic">Read-only insight</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
