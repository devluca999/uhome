import { useEffect, useMemo } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { getPostLoginRedirectPath } from '@/lib/post-login-routing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { ReflectiveGradient } from '@/components/ui/reflective-gradient'
import { Link } from 'react-router-dom'
import {
  motion as motionTokens,
  durationToSeconds,
  createSpring,
  useReducedMotion,
} from '@/lib/motion'
import { Home, Shield, Users } from 'lucide-react'

export function HomePage() {
  const { user, role, loading } = useAuth()
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  // Throttled parallax - reduced intensity and only when motion is allowed
  const parallaxY = useTransform(
    scrollY,
    [0, 500],
    [0, prefersReducedMotion ? 0 : -4] // Reduced from -6 to -4
  )
  const buttonSpring = useMemo(() => createSpring('button'), [])

  useEffect(() => {
    // Redirect authenticated users to their role-appropriate dashboard
    if (!loading && user && role) {
      navigate(getPostLoginRedirectPath(role), { replace: true })
    }
  }, [user, role, loading, navigate])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative">
        <GrainOverlay />
        <div className="text-muted-foreground relative z-10">Loading...</div>
      </div>
    )
  }

  // If user is authenticated, don't show this (will redirect)
  if (user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="text-center max-w-4xl relative z-10"
          initial={{ opacity: motionTokens.opacity.hidden }}
          animate={{ opacity: motionTokens.opacity.visible }}
          transition={{
            duration: durationToSeconds(motionTokens.duration.ambient),
            ease: motionTokens.ease.standard,
          }}
        >
          {/* Abstract Hero Illustration - Reduced infinite animations */}
          <motion.div
            className="mb-8 flex justify-center items-center gap-8 opacity-20 will-change-transform"
            style={{ y: parallaxY }}
            animate={prefersReducedMotion ? {} : { y: [0, -2, 0] }} // Reduced from -3 to -2
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    duration: durationToSeconds(motionTokens.duration.ambient),
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'easeInOut',
                  }
            }
            layout={false}
          >
            <Home className="w-24 h-24" />
            <Shield className="w-16 h-16" />
            <Users className="w-20 h-20" />
          </motion.div>

          <motion.h1
            className="text-6xl font-semibold text-foreground mb-4"
            initial={{ y: 0 }}
            animate={prefersReducedMotion ? {} : { y: [0, -1, 0] }} // Reduced from -2 to -1, removed infinite
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    duration: durationToSeconds(motionTokens.duration.ambient),
                    ease: 'easeInOut',
                  }
            }
            layout={false}
          >
            uhome
          </motion.h1>
          <motion.p
            className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto"
            initial={{ opacity: motionTokens.opacity.subtle }}
            animate={{ opacity: motionTokens.opacity.visible }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    duration: durationToSeconds(motionTokens.duration.ambient),
                    delay: 0.2,
                    ease: motionTokens.ease.standard,
                  }
            }
            layout={false}
          >
            Property management that feels nothing like property management.
          </motion.p>
          <div className="flex gap-4 justify-center">
            <motion.div
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.96 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : {
                      type: 'spring',
                      ...buttonSpring,
                    }
              }
              layout={false}
              className="will-change-transform"
            >
              <Button asChild size="lg">
                <Link to="/login">Sign In</Link>
              </Button>
            </motion.div>
            <motion.div
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.96 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : {
                      type: 'spring',
                      ...buttonSpring,
                    }
              }
              layout={false}
              className="will-change-transform"
            >
              <Button asChild variant="outline" size="lg">
                <Link to="/signup">Sign Up</Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Feature Cards Section */}
      <section className="relative py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.h2
            className="text-4xl font-semibold text-foreground text-center mb-12"
            initial={{ opacity: motionTokens.opacity.hidden, y: 20 }}
            whileInView={{ opacity: motionTokens.opacity.visible, y: 0 }}
            viewport={{ once: true }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    duration: durationToSeconds(motionTokens.duration.base),
                    ease: motionTokens.ease.standard,
                  }
            }
            layout={false}
          >
            Built for independent landlords
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Home,
                title: 'Ditch the spreadsheet',
                description: 'Track rent, expenses, and leases in one place — no formulas required.',
              },
              {
                icon: Shield,
                title: 'One place for every property',
                description: 'Properties, tenants, documents, and maintenance requests all connected.',
              },
              {
                icon: Users,
                title: 'Tenants stay informed',
                description: 'Rent receipts, maintenance updates, and messages — without the back-and-forth.',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: motionTokens.opacity.hidden, y: 20 }}
                whileInView={{ opacity: motionTokens.opacity.visible, y: 0 }}
                viewport={{ once: true }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : {
                        duration: durationToSeconds(motionTokens.duration.base),
                        delay: index * 0.06, // Reduced from 0.1 to 0.06 (60ms)
                        ease: motionTokens.ease.standard,
                      }
                }
                whileHover={prefersReducedMotion ? {} : { y: -4 }}
                layout={false}
                className="will-change-transform-opacity"
              >
                <Card className="glass-card relative overflow-hidden">
                  <GrainOverlay />
                  <MatteLayer intensity="subtle" />
                  <ReflectiveGradient />
                  <CardHeader>
                    <feature.icon className="w-8 h-8 mb-2 text-primary" />
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 px-4 border-t border-border">
        <div className="container mx-auto max-w-6xl flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-foreground underline-offset-4 hover:underline">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  )
}
