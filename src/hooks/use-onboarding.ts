import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'

export type OnboardingFieldType = 'text' | 'textarea' | 'checkbox' | 'date' | 'select' | 'image'

export interface OnboardingField {
  name: string
  label: string
  type: OnboardingFieldType
  required: boolean
  options?: string[]
}

export interface OnboardingTemplate {
  id: string
  property_id: string
  title: string
  fields: OnboardingField[]
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export type OnboardingStatus = 'not_started' | 'in_progress' | 'submitted' | 'reviewed' | 'reopened'

export interface OnboardingSubmission {
  id: string
  tenant_id: string
  template_id: string
  lease_id: string | null
  data: Record<string, unknown>
  image_urls: string[]
  status: OnboardingStatus
  completed_fields: number
  total_fields: number
  submitted_at: string | null
  reviewed_at: string | null
  reopened_at: string | null
  created_at: string
  updated_at: string
}

function isDemoMode(viewMode: string, role: string | null): boolean {
  return role === 'admin' && (viewMode === 'landlord-demo' || viewMode === 'tenant-demo')
}

function countCompleted(data: Record<string, unknown>, fields: OnboardingField[]): number {
  return fields.filter(f => {
    const val = data[f.name]
    if (val === undefined || val === null || val === '') return false
    if (f.type === 'checkbox') return val === true
    return true
  }).length
}

// --- Landlord: template management ---

export function useOnboardingTemplates(propertyId?: string) {
  const { role, viewMode } = useAuth()
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTemplates = useCallback(async () => {
    if (!propertyId) {
      setTemplates([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const { data, error: fetchErr } = await supabase
        .from('onboarding_templates')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
      if (fetchErr) throw fetchErr
      setTemplates((data as OnboardingTemplate[]) || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  async function createTemplate(template: { title: string; fields: OnboardingField[] }) {
    if (isDemoMode(viewMode, role)) return null
    if (!propertyId) return null

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Not authenticated')

    const { data, error: insertErr } = await supabase
      .from('onboarding_templates')
      .insert({
        property_id: propertyId,
        title: template.title,
        fields: template.fields as unknown as Record<string, unknown>,
        created_by: userData.user.id,
      })
      .select()
      .single()

    if (insertErr) throw insertErr
    setTemplates(prev => [data as OnboardingTemplate, ...prev])
    return data as OnboardingTemplate
  }

  async function updateTemplate(
    id: string,
    updates: {
      title?: string
      fields?: OnboardingField[]
      is_active?: boolean
    }
  ) {
    if (isDemoMode(viewMode, role)) return null

    const payload: Record<string, unknown> = {}
    if (updates.title !== undefined) payload.title = updates.title
    if (updates.fields !== undefined) payload.fields = updates.fields
    if (updates.is_active !== undefined) payload.is_active = updates.is_active

    const { data, error: updateErr } = await supabase
      .from('onboarding_templates')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) throw updateErr
    setTemplates(prev => prev.map(t => (t.id === id ? (data as OnboardingTemplate) : t)))
    return data as OnboardingTemplate
  }

  async function deleteTemplate(id: string) {
    if (isDemoMode(viewMode, role)) return

    const { error: deleteErr } = await supabase.from('onboarding_templates').delete().eq('id', id)

    if (deleteErr) throw deleteErr
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: fetchTemplates,
  }
}

// --- Tenant: submission management ---

export function useOnboardingSubmission(tenantId?: string, templateId?: string) {
  const { role, viewMode } = useAuth()
  const [submission, setSubmission] = useState<OnboardingSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchSubmission = useCallback(async () => {
    if (!tenantId || !templateId) {
      setSubmission(null)
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const { data, error: fetchErr } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('template_id', templateId)
        .single()

      if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr
      setSubmission(data as OnboardingSubmission | null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [tenantId, templateId])

  useEffect(() => {
    fetchSubmission()
  }, [fetchSubmission])

  async function saveProgress(fieldData: Record<string, unknown>, template: OnboardingTemplate) {
    if (isDemoMode(viewMode, role)) return null
    if (!tenantId || !templateId) return null

    const mergedData = { ...(submission?.data || {}), ...fieldData }
    const completed = countCompleted(mergedData, template.fields)
    const total = template.fields.filter(f => f.required).length

    if (submission) {
      const { data, error: updateErr } = await supabase
        .from('onboarding_submissions')
        .update({
          data: mergedData,
          completed_fields: completed,
          total_fields: total,
          status: submission.status === 'not_started' ? 'in_progress' : submission.status,
        })
        .eq('id', submission.id)
        .select()
        .single()

      if (updateErr) throw updateErr
      setSubmission(data as OnboardingSubmission)
      return data as OnboardingSubmission
    }

    const { data, error: insertErr } = await supabase
      .from('onboarding_submissions')
      .insert({
        tenant_id: tenantId,
        template_id: templateId,
        data: mergedData,
        completed_fields: completed,
        total_fields: total,
        status: 'in_progress' as const,
      })
      .select()
      .single()

    if (insertErr) throw insertErr
    setSubmission(data as OnboardingSubmission)
    return data as OnboardingSubmission
  }

  async function submitOnboarding(template: OnboardingTemplate) {
    if (isDemoMode(viewMode, role)) return null
    if (!submission) throw new Error('No submission to finalize')

    const requiredFields = template.fields.filter(f => f.required)
    const missing = requiredFields.filter(f => {
      const val = submission.data[f.name]
      if (val === undefined || val === null || val === '') return true
      if (f.type === 'checkbox' && val !== true) return true
      return false
    })

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.map(f => f.label).join(', ')}`)
    }

    const { data, error: updateErr } = await supabase
      .from('onboarding_submissions')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        completed_fields: requiredFields.length,
        total_fields: requiredFields.length,
      })
      .eq('id', submission.id)
      .select()
      .single()

    if (updateErr) throw updateErr

    // Notify property owner
    try {
      const { data: templateData } = await supabase
        .from('onboarding_templates')
        .select('property_id')
        .eq('id', submission.template_id)
        .single()

      if (templateData) {
        const { data: propertyData } = await supabase
          .from('properties')
          .select('owner_id, name')
          .eq('id', templateData.property_id)
          .single()

        if (propertyData) {
          await supabase.from('notifications').insert({
            user_id: propertyData.owner_id,
            type: 'system',
            title: 'Onboarding Submitted',
            message: `A tenant has completed their move-in checklist for ${propertyData.name}`,
            read: false,
          })
        }
      }
    } catch {
      // Non-critical: notification failure shouldn't block submission
    }

    setSubmission(data as OnboardingSubmission)
    return data as OnboardingSubmission
  }

  return { submission, loading, error, saveProgress, submitOnboarding, refetch: fetchSubmission }
}

// --- Tenant: pending onboarding check ---

export interface PendingOnboarding {
  hasPending: boolean
  progress: { completed: number; total: number }
  submission: OnboardingSubmission | null
  template: OnboardingTemplate | null
}

export function usePendingOnboarding(tenantId?: string, propertyId?: string) {
  const [pending, setPending] = useState<PendingOnboarding>({
    hasPending: false,
    progress: { completed: 0, total: 0 },
    submission: null,
    template: null,
  })
  const [loading, setLoading] = useState(true)

  const fetchPending = useCallback(async () => {
    if (!tenantId || !propertyId) {
      setPending({
        hasPending: false,
        progress: { completed: 0, total: 0 },
        submission: null,
        template: null,
      })
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const { data: templates } = await supabase
        .from('onboarding_templates')
        .select('*')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (!templates) {
        setPending({
          hasPending: false,
          progress: { completed: 0, total: 0 },
          submission: null,
          template: null,
        })
        return
      }

      const template = templates as OnboardingTemplate

      const { data: sub } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('template_id', template.id)
        .single()

      const submission = sub as OnboardingSubmission | null
      const needsAction =
        !submission ||
        submission.status === 'not_started' ||
        submission.status === 'in_progress' ||
        submission.status === 'reopened'

      setPending({
        hasPending: needsAction,
        progress: {
          completed: submission?.completed_fields || 0,
          total: submission?.total_fields || template.fields.filter(f => f.required).length,
        },
        submission,
        template,
      })
    } catch {
      setPending({
        hasPending: false,
        progress: { completed: 0, total: 0 },
        submission: null,
        template: null,
      })
    } finally {
      setLoading(false)
    }
  }, [tenantId, propertyId])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  return { ...pending, loading, refetch: fetchPending }
}
