import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { useAuth } from '@/contexts/auth-context'
import { appEnvironment } from '@/config/environment'
import { cn } from '@/lib/utils'

const DEMO_HINT_DISMISS_KEY = 'landlord_first_run_demo_hint_dismissed'

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(DEMO_HINT_DISMISS_KEY) === '1'
}

export interface FirstRunPromptProps {
  className?: string
}

export function FirstRunPrompt({ className }: FirstRunPromptProps) {
  const navigate = useNavigate()
  const { role, viewMode, demoState, setDemoState } = useAuth()
  const [demoHintDismissed, setDemoHintDismissed] = useState(readDismissed)

  const showDemoHint = useMemo(() => {
    if (demoHintDismissed) return false
    const adminEmptyDemo =
      role === 'admin' && viewMode === 'landlord-demo' && demoState === 'empty'
    const nonProd = appEnvironment.kind !== 'production'
    return adminEmptyDemo || nonProd
  }, [demoHintDismissed, role, viewMode, demoState])

  const handleLoadDemoData = useCallback(() => {
    const adminEmptyDemo =
      role === 'admin' && viewMode === 'landlord-demo' && demoState === 'empty'
    if (adminEmptyDemo) {
      setDemoState('populated')
      return
    }
    if (appEnvironment.kind !== 'production') {
      navigate('/login')
    }
  }, [role, viewMode, demoState, setDemoState, navigate])

  const handleDismissDemoHint = useCallback(() => {
    localStorage.setItem(DEMO_HINT_DISMISS_KEY, '1')
    setDemoHintDismissed(true)
  }, [])

  return (
    <motion.div
      initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      transition={{
        duration: durationToSeconds(motionTokens.duration.base),
        ease: motionTokens.ease.standard,
      }}
      className={cn('flex justify-center w-full', className)}
    >
      <Card className="glass-card w-full max-w-lg md:max-w-xl border-primary/15 shadow-lg">
        <CardHeader className="text-center sm:text-left space-y-4 items-center sm:items-start">
          <img
            src="/logo.png"
            alt="uhome"
            className="h-8 w-8 object-contain flex-shrink-0"
            style={{ imageRendering: 'auto' }}
            onError={e => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <div>
            <CardTitle className="text-2xl sm:text-3xl font-semibold leading-snug">
              Add your first property to get started
            </CardTitle>
            <CardDescription className="text-base mt-2 text-muted-foreground">
              Once you add a property, you can invite tenants, track rent, and manage everything
              from here.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            size="lg"
            className="w-full sm:w-auto sm:self-center"
            onClick={() => navigate('/landlord/properties?action=add')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>

          {showDemoHint && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 pt-1 border-t border-border/60">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline text-center sm:text-left bg-transparent border-0 cursor-pointer p-0"
                onClick={handleLoadDemoData}
              >
                Load demo data
              </button>
              <span className="hidden sm:inline text-muted-foreground/50">·</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-8 gap-1 sm:ml-0"
                onClick={handleDismissDemoHint}
              >
                <X className="h-3.5 w-3.5" />
                Dismiss
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
