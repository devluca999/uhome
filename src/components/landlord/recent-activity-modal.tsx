import { useState, useMemo } from 'react'
// useNavigate removed - not used
import { Drawer } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { ActivityFeedItem } from '@/components/ui/activity-feed-item'
import { X, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { motionTokens, durationToSeconds } from '@/lib/motion'

export interface Activity {
  id: string
  title: string
  description?: string
  timestamp: string
  icon: React.ReactNode
  onClick: () => void
}

interface RecentActivityModalProps {
  isOpen: boolean
  onClose: () => void
  activities: Activity[]
  onClearActivity?: (id: string) => void
  onClearAll?: () => void
}

export function RecentActivityModal({
  isOpen,
  onClose,
  activities,
  onClearActivity,
  onClearAll,
}: RecentActivityModalProps) {
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set())

  const visibleActivities = useMemo(() => {
    return activities.filter(a => !clearedIds.has(a.id))
  }, [activities, clearedIds])

  const handleClearActivity = (id: string) => {
    setClearedIds(prev => new Set(prev).add(id))
    onClearActivity?.(id)
  }

  const handleClearAll = () => {
    setClearedIds(new Set(activities.map(a => a.id)))
    onClearAll?.()
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Recent Activity" side="right">
      <div className="space-y-4">
        {activities.length > 0 && (
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <span className="text-sm text-muted-foreground">
              {visibleActivities.length} of {activities.length} activities
            </span>
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        )}

        {visibleActivities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {visibleActivities.map(activity => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{
                    duration: durationToSeconds(motionTokens.duration.base),
                    ease: motionTokens.easing.standard,
                  }}
                >
                  <div className="flex items-start gap-2 group">
                    <div className="flex-1">
                      <ActivityFeedItem
                        title={activity.title}
                        description={activity.description}
                        timestamp={activity.timestamp}
                        icon={activity.icon}
                        onClick={activity.onClick}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClearActivity(activity.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                      aria-label="Clear activity"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Drawer>
  )
}
