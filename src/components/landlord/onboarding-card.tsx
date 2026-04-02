import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Home, Users, Wrench } from 'lucide-react'
import { motion } from 'framer-motion'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { useNavigate } from 'react-router-dom'

interface OnboardingCardProps {
  onDismiss?: () => void
}

export function OnboardingCard({ onDismiss }: OnboardingCardProps) {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      transition={{
        duration: durationToSeconds(motionTokens.duration.base),
        ease: motionTokens.ease.standard,
      }}
    >
      <Card className="glass-card border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Home className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Welcome to uhome!</CardTitle>
              <CardDescription>Let's get your portfolio set up</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Start managing your properties by adding your first property to uhome. Once added,
            you'll be able to:
          </p>

          <div className="grid gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-matte/30">
              <Users className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">Manage Tenants</h4>
                <p className="text-sm text-muted-foreground">
                  Track leases, collect rent, and communicate with tenants
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-matte/30">
              <Wrench className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">Track Maintenance</h4>
                <p className="text-sm text-muted-foreground">
                  Handle work orders and keep your properties in great shape
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              size="lg"
              className="flex-1"
              onClick={() => navigate('/landlord/properties?action=add')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Property
            </Button>
            {onDismiss && (
              <Button size="lg" variant="ghost" onClick={onDismiss}>
                Maybe Later
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
