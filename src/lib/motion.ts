/**
 * uhome Motion Tokens
 * Apple-like minimalism with soft physics-based motion
 */

import { useEffect, useState } from 'react'
import { useSettings } from '@/contexts/settings-context'

// Reduced Motion Hook
// Checks both OS preference and user setting
export function useReducedMotion(): boolean {
  const { settings } = useSettings()
  const [osPrefersReducedMotion, setOsPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setOsPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setOsPrefersReducedMotion(e.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [])

  // Return true if either OS preference or user setting is enabled
  return osPrefersReducedMotion || settings.reduceMotion
}

// Helper to disable animations when reduced motion is preferred
export function shouldReduceMotion(reducedMotion: boolean): boolean {
  return reducedMotion
}

// Motion Tokens - Global constants for consistent motion
export const motionTokens = {
  easing: {
    standard: [0.22, 1, 0.36, 1] as [number, number, number, number],
    elastic: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  },
  // Alias for backward compatibility
  ease: {
    standard: [0.22, 1, 0.36, 1] as [number, number, number, number],
  },
  duration: {
    fast: 0.18,
    normal: 0.32,
    slow: 0.48,
    // Alias for backward compatibility (180ms, kept in ms for durationToSeconds function)
    base: 180,
  },
  spring: {
    soft: { stiffness: 180, damping: 22 },
    bouncy: { stiffness: 260, damping: 18 },
  },
  opacity: {
    hidden: 0,
    subtle: 0.6,
    visible: 1,
  },
  translate: {
    y: 8,
  },
} as const

// Timing Tokens (legacy support - maps to motionTokens)
export const motion = {
  duration: {
    instant: 80, // micro feedback (tap highlight)
    fast: 120, // button press/release
    base: 180, // card hover, modals
    slow: 280, // page transitions
    ambient: 1200, // background / landing visuals
  },
  ease: {
    // Framer Motion expects array format [x1, y1, x2, y2] for cubic-bezier
    standard: motionTokens.easing.standard,
  },
  scale: {
    press: 0.96,
    hover: 1.02,
    modal: {
      from: 0.98,
      to: 1,
    },
  },
  translate: {
    y: 8,
  },
  opacity: {
    hidden: 0,
    subtle: 0.6,
    visible: 1,
  },
} as const

// Material Tokens
export const material = {
  blur: {
    background: 16,
    modal: 24,
  },
  glass: {
    opacity: 0.72,
  },
} as const

// Shadow Tokens (Apple-like)
export const shadow = {
  card: '0px 12px 30px rgba(0,0,0,0.18)',
  hover: '0px 20px 50px rgba(0,0,0,0.22)',
  modal: '0px 40px 80px rgba(0,0,0,0.28)',
} as const

// Spring Presets (for Framer Motion)
// Optimized: Reduced stiffness for large surfaces, clamped overshoot
export const spring = {
  button: {
    stiffness: 420,
    damping: 26,
    mass: 0.8,
  },
  card: {
    stiffness: 300, // Reduced from 320 for better performance on large surfaces
    damping: 28,
    mass: 1,
  },
  modal: {
    stiffness: 240, // Reduced from 260, clamped overshoot
    damping: 30,
    mass: 1.1,
  },
  scroll: {
    stiffness: 180,
    damping: 22,
    mass: 1.2,
  },
  soft: motionTokens.spring.soft,
  bouncy: motionTokens.spring.bouncy,
} as const

// Helper function to create Framer Motion spring config
export function createSpring(preset: keyof typeof spring) {
  return spring[preset]
}

// Helper function to convert duration to seconds (for Framer Motion)
export function durationToSeconds(ms: number): number {
  return ms / 1000
}

// CSS string version of easing for use in CSS (not Framer Motion)
export const easeCss = {
  standard: 'cubic-bezier(0.22, 1, 0.36, 1)',
  elastic: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const
