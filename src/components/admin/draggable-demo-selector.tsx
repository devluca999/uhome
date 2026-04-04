import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/auth-context'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'
import { useReducedMotion } from '@/lib/motion'
import { Settings, ChevronRight, ChevronLeft, GripVertical } from 'lucide-react'

type ViewMode = 'admin' | 'landlord-demo' | 'tenant-demo'
type DemoState = 'populated' | 'empty'

const SELECT_STYLE =
  'flex h-8 min-w-[140px] rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function DraggableDemoSelector() {
  const { role, viewMode, setViewMode, demoState, setDemoState } = useAuth()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const floatingRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  // Handlers defined with useCallback MUST come before conditional returns
  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode)
      if (mode === 'admin') {
        navigate('/admin/overview')
      } else if (mode === 'landlord-demo') {
        navigate('/landlord/dashboard')
      } else if (mode === 'tenant-demo') {
        navigate('/tenant/dashboard')
      }
    },
    [setViewMode, navigate]
  )

  const handleDemoStateChange = useCallback(
    (state: DemoState) => {
      setDemoState(state)
    },
    [setDemoState]
  )

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev)
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isSidebarOpen) return

      setIsDragging(true)
      const rect = floatingRef.current?.getBoundingClientRect()
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
    },
    [isSidebarOpen]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || isSidebarOpen) return

      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y

      // Keep within viewport bounds
      const maxX = window.innerWidth - 60
      const maxY = window.innerHeight - 60
      const minX = 0
      const minY = 0

      setPosition({
        x: Math.max(minX, Math.min(maxX, newX)),
        y: Math.max(minY, Math.min(maxY, newY)),
      })
    },
    [isDragging, isSidebarOpen, dragOffset]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Load position from localStorage on mount
  useEffect(() => {
    const savedPosition = localStorage.getItem('admin-demo-selector-position')
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition)
        setPosition(parsed)
      } catch (error) {
        console.warn('Failed to parse saved position:', error)
      }
    }
  }, [])

  // Save position to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('admin-demo-selector-position', JSON.stringify(position))
  }, [position])

  // Set up global event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Early return for non-admin users - must be AFTER all hooks
  if (role !== 'admin') {
    return null
  }

  // Sidebar content
  const sidebarContent = (
    <div className="w-80">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">Admin Demo Mode</span>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleSidebar} className="h-8 w-8 p-0">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">View as:</label>
          <select
            value={viewMode}
            onChange={e => handleViewModeChange(e.target.value as ViewMode)}
            className={cn(SELECT_STYLE)}
            aria-label="Admin view mode"
          >
            <option value="admin">Admin</option>
            <option value="landlord-demo">Landlord (Demo)</option>
            <option value="tenant-demo">Tenant (Demo)</option>
          </select>
        </div>

        {(viewMode === 'landlord-demo' || viewMode === 'tenant-demo') && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Data:</label>
            <select
              value={demoState}
              onChange={e => handleDemoStateChange(e.target.value as DemoState)}
              className={cn(SELECT_STYLE)}
              aria-label="Demo data state"
            >
              <option value="populated">Populated</option>
              <option value="empty">Empty</option>
            </select>
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">Current State:</div>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-muted rounded text-foreground">
              {viewMode === 'admin'
                ? 'Admin Mode'
                : viewMode === 'landlord-demo'
                  ? 'Landlord Demo'
                  : 'Tenant Demo'}
            </span>
            {(viewMode === 'landlord-demo' || viewMode === 'tenant-demo') && (
              <span className="px-2 py-1 bg-muted rounded text-foreground">
                {demoState === 'populated' ? 'Populated Data' : 'Empty Data'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // Floating icon — z-[9999] ensures it renders above modals, drawers, dropdowns
  const floatingIcon = (
    <motion.div
      ref={floatingRef}
      className={cn(
        'fixed z-[9999] bg-card border border-amber-400/50 rounded-lg shadow-lg cursor-move hover:shadow-xl transition-shadow',
        isDragging ? 'shadow-xl ring-2 ring-amber-400/40' : ''
      )}
      style={{
        left: position.x,
        top: position.y,
        touchAction: 'none',
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        duration: prefersReducedMotion ? 0 : durationToSeconds(motionTokens.duration.base),
        ease: motionTokens.ease.standard,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="p-2">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-1">
            <Settings className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Demo</span>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleSidebar} className="h-6 w-6 p-0 ml-1">
            <ChevronLeft className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  )

  return (
    <>
      {/* Floating Icon */}
      {floatingIcon}

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{
              duration: prefersReducedMotion ? 0 : durationToSeconds(motionTokens.duration.base),
              ease: motionTokens.ease.standard,
            }}
            className="fixed top-4 right-4 z-[9999] bg-background/95 backdrop-blur-md border-l border-border shadow-xl"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay when sidebar is open */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="fixed inset-0 bg-background/50 backdrop-blur-sm z-[9998]"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>
    </>
  )
}
