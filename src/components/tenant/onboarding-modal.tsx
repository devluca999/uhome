import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useImageUpload } from '@/hooks/use-image-upload'
import {
  useOnboardingSubmission,
  type OnboardingTemplate,
  type OnboardingField,
} from '@/hooks/use-onboarding'
import { X, Upload, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { motionTokens } from '@/lib/motion'

interface OnboardingModalProps {
  template: OnboardingTemplate
  tenantId: string
  isOpen: boolean
  onClose: () => void
  onSubmitted: () => void
}

export function OnboardingModal({
  template,
  tenantId,
  isOpen,
  onClose,
  onSubmitted,
}: OnboardingModalProps) {
  const { submission, saveProgress, submitOnboarding } = useOnboardingSubmission(
    tenantId,
    template.id
  )
  const { uploadImage, uploading: uploadingImage } = useImageUpload('onboarding-images' as any)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (submission?.data && !initializedRef.current) {
      setFormData(submission.data)
      initializedRef.current = true
    }
  }, [submission])

  useEffect(() => {
    if (isOpen) {
      initializedRef.current = false
      if (submission?.data) {
        setFormData(submission.data)
        initializedRef.current = true
      }
    }
  }, [isOpen, submission])

  const requiredFields = template.fields.filter(f => f.required)
  const completedCount = requiredFields.filter(f => {
    const val = formData[f.name]
    if (val === undefined || val === null || val === '') return false
    if (f.type === 'checkbox') return val === true
    return true
  }).length

  function handleFieldChange(fieldName: string, value: unknown) {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
    setValidationError(null)
  }

  async function handleDismiss() {
    if (Object.keys(formData).length > 0) {
      try {
        await saveProgress(formData, template)
      } catch {
        // Save failure on dismiss is non-critical
      }
    }
    onClose()
  }

  async function handleSubmit() {
    if (submitting) return
    setValidationError(null)

    const missing = requiredFields.filter(f => {
      const val = formData[f.name]
      if (val === undefined || val === null || val === '') return true
      if (f.type === 'checkbox' && val !== true) return true
      return false
    })

    if (missing.length > 0) {
      setValidationError(`Please complete: ${missing.map(f => f.label).join(', ')}`)
      return
    }

    try {
      setSubmitting(true)
      await saveProgress(formData, template)
      await submitOnboarding(template)
      setSubmitSuccess(true)
      setTimeout(() => {
        onSubmitted()
      }, 1500)
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleImageUpload(fieldName: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file, `onboarding-${tenantId}`)
    if (url) {
      handleFieldChange(fieldName, url)
    }
    e.target.value = ''
  }

  function renderField(field: OnboardingField) {
    const value = formData[field.name]

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={(value as string) || ''}
            onChange={e => handleFieldChange(field.name, e.target.value)}
            placeholder={field.label}
            disabled={submitting}
          />
        )
      case 'textarea':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={e => handleFieldChange(field.name, e.target.value)}
            placeholder={field.label}
            rows={3}
            disabled={submitting}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        )
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={e => handleFieldChange(field.name, e.target.checked)}
              disabled={submitting}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm text-foreground">{field.label}</span>
          </label>
        )
      case 'date':
        return (
          <Input
            type="date"
            value={(value as string) || ''}
            onChange={e => handleFieldChange(field.name, e.target.value)}
            disabled={submitting}
          />
        )
      case 'select':
        return (
          <select
            value={(value as string) || ''}
            onChange={e => handleFieldChange(field.name, e.target.value)}
            disabled={submitting}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )
      case 'image':
        return (
          <div className="space-y-2">
            {typeof value === 'string' && value && (
              <img
                src={value}
                alt={field.label}
                className="w-full max-h-32 object-cover rounded-md border"
              />
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingImage || submitting}
              onClick={() => document.getElementById(`upload-${field.name}`)?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadingImage ? 'Uploading...' : value ? 'Replace Image' : 'Upload Image'}
            </Button>
            <input
              id={`upload-${field.name}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => handleImageUpload(field.name, e)}
            />
          </div>
        )
      default:
        return (
          <Input
            value={(value as string) || ''}
            onChange={e => handleFieldChange(field.name, e.target.value)}
            disabled={submitting}
          />
        )
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleDismiss} />
        <motion.div
          className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: motionTokens.duration.normal }}
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{template.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">
                    {completedCount} of {requiredFields.length} completed
                  </Badge>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[80px]">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{
                        width: `${requiredFields.length > 0 ? (completedCount / requiredFields.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-md hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              {submitSuccess ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <CheckCircle2 className="h-12 w-12 text-primary" />
                  <p className="text-lg font-medium">Checklist Submitted!</p>
                  <p className="text-sm text-muted-foreground">Your landlord will be notified.</p>
                </div>
              ) : (
                <>
                  {validationError && (
                    <div className="flex items-start gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      {validationError}
                    </div>
                  )}

                  {template.fields.map(field => (
                    <div key={field.name} className="space-y-1.5">
                      {field.type !== 'checkbox' && (
                        <label className="text-sm font-medium text-foreground">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </label>
                      )}
                      {renderField(field)}
                    </div>
                  ))}

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || completedCount < requiredFields.length}
                      className="flex-1"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Checklist'
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleDismiss} disabled={submitting}>
                      Save & Close
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
