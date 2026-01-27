import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { usePropertyTypes } from '@/hooks/use-property-types'
import { motion, AnimatePresence } from 'framer-motion'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface PropertyTypeSelectProps {
  value?: string | null
  onChange: (value: string) => void
  onCustomTypeCreated?: (typeName: string) => void
  disabled?: boolean
  className?: string
}

export function PropertyTypeSelect({
  value,
  onChange,
  onCustomTypeCreated,
  disabled,
  className,
}: PropertyTypeSelectProps) {
  const { predefinedTypes, customTypes, createCustomType } = usePropertyTypes()
  const [showOtherInput, setShowOtherInput] = useState(false)
  const [otherValue, setOtherValue] = useState('')
  const [saveAsNewType, setSaveAsNewType] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleTypeChange = (selectedValue: string) => {
    if (selectedValue === 'other') {
      setShowOtherInput(true)
    } else {
      setShowOtherInput(false)
      onChange(selectedValue)
    }
  }

  const handleOtherSubmit = async () => {
    if (!otherValue.trim()) return

    if (saveAsNewType) {
      setSaving(true)
      const result = await createCustomType(otherValue.trim())
      setSaving(false)

      if (result.error) {
        console.error('Error saving custom type:', result.error)
        // Still use the value even if save fails
      } else if (result.data && onCustomTypeCreated) {
        onCustomTypeCreated(result.data.type_name)
      }
    }

    onChange(otherValue.trim())
    setShowOtherInput(false)
    setOtherValue('')
    setSaveAsNewType(false)
  }

  const handleOtherCancel = () => {
    setShowOtherInput(false)
    setOtherValue('')
    setSaveAsNewType(false)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor="property_type" className="text-sm font-medium text-foreground">
        Property Type
      </label>
      {!showOtherInput ? (
        <select
          id="property_type"
          value={value || ''}
          onChange={e => handleTypeChange(e.target.value)}
          disabled={disabled}
          className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="" className="text-foreground">
            Select type...
          </option>
          {predefinedTypes.map(type => (
            <option key={type} value={type} className="text-foreground">
              {type === 'other' ? 'Other...' : type}
            </option>
          ))}
          {customTypes.length > 0 && (
            <>
              <option disabled className="text-foreground">
                --- Custom Types ---
              </option>
              {customTypes.map(type => (
                <option key={type.id} value={type.type_name} className="text-foreground">
                  {type.type_name}
                </option>
              ))}
            </>
          )}
        </select>
      ) : (
        <AnimatePresence initial={false}>
          <motion.div
            initial={{ opacity: 0, maxHeight: 0 }}
            animate={{ opacity: 1, maxHeight: 300 }}
            exit={{ opacity: 0, maxHeight: 0 }}
            transition={{
              duration: durationToSeconds(motionTokens.duration.base),
              ease: motionTokens.ease.standard,
            }}
            style={{ overflow: 'hidden' }}
            className="space-y-2"
            layout={false}
          >
            <Input
              value={otherValue}
              onChange={e => setOtherValue(e.target.value)}
              placeholder="Enter property type"
              disabled={disabled || saving}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleOtherSubmit()
                } else if (e.key === 'Escape') {
                  handleOtherCancel()
                }
              }}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="save_as_new_type"
                checked={saveAsNewType}
                onChange={e => setSaveAsNewType(e.target.checked)}
                disabled={disabled || saving}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="save_as_new_type" className="text-xs text-muted-foreground">
                Save as new type for future use
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleOtherSubmit}
                disabled={disabled || saving || !otherValue.trim()}
                className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Use Type'}
              </button>
              <button
                type="button"
                onClick={handleOtherCancel}
                disabled={disabled || saving}
                className="text-xs px-3 py-1.5 rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
