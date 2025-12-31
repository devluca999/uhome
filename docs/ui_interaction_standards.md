# UI/Interaction Standards — uhome

## Motion Constraints

### Duration
- **Instant**: 80ms - Micro feedback (tap highlight)
- **Fast**: 120ms - Button press/release
- **Base**: 180ms - Card hover, modals, most transitions
- **Slow**: 280ms - Page transitions
- **Ambient**: 1200ms - Background visuals (landing page)

### Easing
- **Standard**: `cubic-bezier(0.22, 1, 0.36, 1)` - Apple-esque smoothness
- **Spring**: Use Framer Motion spring presets for natural motion
  - Button: `stiffness: 420, damping: 26, mass: 0.8`
  - Card: `stiffness: 320, damping: 28, mass: 1`
  - Modal: `stiffness: 260, damping: 30, mass: 1.1`

### Reduced Motion
- **Always check**: `window.matchMedia('(prefers-reduced-motion: reduce)')`
- **Respect preference**: Disable animations when user prefers reduced motion
- **Fallback**: Use instant transitions (0ms) or CSS-only transitions

## Hover Effects

### Ledger Rows
- **Background**: Subtle background tint (`rgba(0, 0, 0, 0.02)`)
- **Cursor**: `pointer` to indicate clickability
- **Transition**: 120ms ease-out

### Chart Segments/Bars
- **Highlight**: Slightly increase opacity or add border
- **Tooltip**: Show on hover with exact values
- **Transition**: 150ms ease-out

### Property Cards
- **Lift**: `y: -2px` or `y: -4px`
- **Shadow**: Bloom to `shadow.hover`
- **Scale**: Optional `scale: 1.01` (subtle)
- **Transition**: Spring (card preset)

### Expense Items
- **Background**: Subtle tint
- **Lift**: `y: -2px`
- **Transition**: 150ms ease-out

## State Change Animations

### Date Range Switches
- **Charts**: Smoothly morph data (recharts animation)
- **Ledger rows**: Fade out old, fade in new
- **Duration**: 180ms base
- **Easing**: Standard cubic-bezier

### Ledger Filtering
- **Rows**: Fade + slide (AnimatePresence)
  - Exit: `opacity: 0, y: -8px`
  - Enter: `opacity: 1, y: 0`
- **No hard re-renders**: Use AnimatePresence for smooth transitions
- **Duration**: 180ms

### Expand/Collapse
- **Height animation**: Use `height: 'auto'` with AnimatePresence
- **Opacity**: Fade in/out with height
- **Duration**: 180ms
- **Easing**: Standard cubic-bezier

### Modal/Dialog Entrances
- **Fade + scale**: `opacity: 0 → 1, scale: 0.98 → 1`
- **Backdrop blur**: Animate backdrop opacity
- **Duration**: 180ms
- **Spring**: Use modal spring preset

## Number Animations

### When to Animate
- Value changes (rent collected, expenses, profit)
- Filter changes (summary cards update)
- Date range changes (chart values)

### Implementation
- Use Framer Motion `useMotionValue`, `useSpring`, `useTransform`
- Spring preset: Card (softer, more natural)
- Format: Currency, percentages, counts

### Example
```typescript
const motionValue = useMotionValue(0)
const spring = createSpring('card')
const animatedValue = useSpring(motionValue, spring)
const displayValue = useTransform(animatedValue, (v) => `$${Math.round(v).toLocaleString()}`)
```

## Loading States

### Skeleton Loaders (Preferred)
- **Table rows**: Skeleton with 4-5 columns
- **Cards**: Skeleton with title, description, content areas
- **Charts**: Skeleton with chart-like shape
- **Duration**: Show until data loads, then fade in

### Spinners (Avoid)
- ❌ Don't use spinners for data loading
- ✅ Use skeleton loaders instead
- ⚠️ Spinners only for form submissions (brief)

### Fade-In on Load
- **Data loads**: Fade in from `opacity: 0` to `opacity: 1`
- **Duration**: 180ms
- **Easing**: Standard cubic-bezier

## Interaction Patterns

### Clickable Elements
- **Buttons**: Press scale (`scale: 0.96`) on tap
- **Cards**: Hover lift, click expands or navigates
- **Links**: Underline on hover (if text link)

### Form Interactions
- **Input focus**: Ring appears, smooth transition
- **Validation errors**: Fade in error message
- **Success states**: Subtle checkmark or success message

### List Interactions
- **Add item**: Slide down + fade in
- **Remove item**: Slide up + fade out
- **Reorder**: Smooth position transition (if implemented)

## Visual Feedback

### Success States
- **Color**: Green accent (subtle)
- **Icon**: Checkmark (optional)
- **Duration**: 2-3 seconds, then fade out

### Error States
- **Color**: Red accent (subtle)
- **Message**: Clear, actionable
- **Persistence**: Until user action

### Loading States
- **Skeleton**: Preferred
- **Spinner**: Only for form submissions
- **Progress**: For long operations (rare in MVP)

## Accessibility

### Reduced Motion
- **Check**: `prefers-reduced-motion` media query
- **Disable**: All animations when preference is set
- **Fallback**: Instant transitions or CSS-only

### Keyboard Navigation
- **Focus states**: Clear, visible focus rings
- **Tab order**: Logical flow
- **Keyboard shortcuts**: Not required for MVP

### Screen Readers
- **ARIA labels**: On all interactive elements
- **Semantic HTML**: Use proper elements
- **Alt text**: For images and icons

## Implementation Guidelines

### Use Motion Tokens
- Import from `@/lib/motion`
- Use `durationToSeconds()` for Framer Motion
- Use `createSpring()` for spring animations
- Use `motionTokens.ease.standard` for easing

### Component Patterns
```typescript
// Hover effect
<motion.div
  whileHover={{ y: -2 }}
  transition={{ type: 'spring', ...cardSpring }}
>

// Fade in
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.18, ease: motionTokens.ease.standard }}
>

// Number animation
const motionValue = useMotionValue(0)
const spring = createSpring('card')
const animatedValue = useSpring(motionValue, spring)
```

### Reduced Motion Check
```typescript
const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

// Use in transitions
transition={{
  duration: prefersReducedMotion ? 0 : durationToSeconds(motionTokens.duration.base),
  ease: motionTokens.ease.standard,
}}
```

## Consistency Rules

1. **Always use motion tokens** - Don't hardcode durations
2. **Check reduced motion** - Respect user preferences
3. **Use AnimatePresence** - For list item animations
4. **Skeleton loaders** - Not spinners for data loading
5. **Spring for interactions** - Ease-out for transitions
6. **150-250ms range** - For most interactions
7. **No decorative animation** - Only functional motion

