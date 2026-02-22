import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  useOnboardingTemplates,
  type OnboardingField,
  type OnboardingFieldType,
  type OnboardingTemplate,
} from '@/hooks/use-onboarding'
import { Plus, Trash2, GripVertical, Save, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface OnboardingTemplateEditorProps {
  propertyId: string
}

const FIELD_TYPES: { value: OnboardingFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'image', label: 'Image Upload' },
]

export function OnboardingTemplateEditor({ propertyId }: OnboardingTemplateEditorProps) {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } =
    useOnboardingTemplates(propertyId)
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('Move-In Checklist')
  const [fields, setFields] = useState<OnboardingField[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({})

  async function checkSubmissionCount(templateId: string) {
    const { count } = await supabase
      .from('onboarding_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', templateId)
      .in('status', ['in_progress', 'not_started', 'reopened'])

    setSubmissionCounts(prev => ({ ...prev, [templateId]: count || 0 }))
    return count || 0
  }

  function startCreate() {
    setCreating(true)
    setEditing(null)
    setTitle('Move-In Checklist')
    setFields([
      { name: 'emergency_contact', label: 'Emergency Contact Name', type: 'text', required: true },
      { name: 'emergency_phone', label: 'Emergency Contact Phone', type: 'text', required: true },
      { name: 'vehicle_info', label: 'Vehicle Information (make, model, plate)', type: 'text', required: false },
      { name: 'move_in_date_confirmed', label: 'I confirm my move-in date', type: 'checkbox', required: true },
      { name: 'rules_acknowledged', label: 'I have read and agree to the house rules', type: 'checkbox', required: true },
    ])
    setError(null)
  }

  function startEdit(template: OnboardingTemplate) {
    setEditing(template.id)
    setCreating(false)
    setTitle(template.title)
    setFields(template.fields)
    setError(null)
    checkSubmissionCount(template.id)
  }

  function cancelEdit() {
    setEditing(null)
    setCreating(false)
    setError(null)
  }

  function addField() {
    const name = `field_${Date.now()}`
    setFields(prev => [
      ...prev,
      { name, label: '', type: 'text', required: true },
    ])
  }

  function updateField(index: number, updates: Partial<OnboardingField>) {
    setFields(prev =>
      prev.map((f, i) => {
        if (i !== index) return f
        const updated = { ...f, ...updates }
        if (updates.label && f.name.startsWith('field_')) {
          updated.name = updates.label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '')
        }
        return updated
      })
    )
  }

  function removeField(index: number) {
    setFields(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (fields.length === 0) {
      setError('Add at least one field')
      return
    }
    const emptyLabels = fields.filter(f => !f.label.trim())
    if (emptyLabels.length > 0) {
      setError('All fields must have a label')
      return
    }

    try {
      setSaving(true)
      setError(null)

      if (creating) {
        await createTemplate({ title, fields })
      } else if (editing) {
        await updateTemplate(editing, { title, fields })
      }

      cancelEdit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(template: OnboardingTemplate) {
    try {
      await updateTemplate(template.id, { is_active: !template.is_active })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template? This cannot be undone.')) return
    try {
      await deleteTemplate(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Loading templates...</p>
  }

  const isEditing = creating || editing

  return (
    <div className="space-y-4">
      {!isEditing && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-foreground">Onboarding Templates</h3>
              <p className="text-sm text-muted-foreground">
                Create checklists for new tenants to complete when they move in.
              </p>
            </div>
            <Button size="sm" onClick={startCreate}>
              <Plus className="mr-2 h-4 w-4" /> New Template
            </Button>
          </div>

          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No onboarding templates yet. Create one to get started.
            </p>
          )}

          {templates.map(t => (
            <Card key={t.id} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <div>
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <CardDescription>
                    {t.fields.length} fields &middot;{' '}
                    {t.fields.filter(f => f.required).length} required
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={t.is_active ? 'default' : 'secondary'}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Switch
                    checked={t.is_active}
                    onCheckedChange={() => handleToggleActive(t)}
                  />
                </div>
              </CardHeader>
              <CardContent className="flex gap-2 pt-0">
                <Button size="sm" variant="outline" onClick={() => startEdit(t)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => handleDelete(t.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {isEditing && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{creating ? 'Create Template' : 'Edit Template'}</CardTitle>
            {editing && (submissionCounts[editing] || 0) > 0 && (
              <div className="flex items-start gap-2 p-3 mt-2 text-sm bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {submissionCounts[editing]} tenant(s) have in-progress submissions.
                  Changes apply only to new submissions.
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Template Title</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Move-In Checklist"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Fields</label>
              {fields.map((field, i) => (
                <div
                  key={field.name + i}
                  className="flex items-start gap-2 p-3 rounded-md border bg-muted/30"
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Input
                      value={field.label}
                      onChange={e => updateField(i, { label: e.target.value })}
                      placeholder="Field label"
                      className="text-sm"
                    />
                    <div className="flex items-center gap-3">
                      <select
                        value={field.type}
                        onChange={e =>
                          updateField(i, { type: e.target.value as OnboardingFieldType })
                        }
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                      >
                        {FIELD_TYPES.map(ft => (
                          <option key={ft.value} value={ft.value}>
                            {ft.label}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={e => updateField(i, { required: e.target.checked })}
                          className="h-3.5 w-3.5"
                        />
                        Required
                      </label>
                      {field.type === 'select' && (
                        <Input
                          value={field.options?.join(', ') || ''}
                          onChange={e =>
                            updateField(i, {
                              options: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                            })
                          }
                          placeholder="Option 1, Option 2, ..."
                          className="text-xs h-8 flex-1"
                        />
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeField(i)}
                    className="p-1 hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addField}>
                <Plus className="mr-2 h-4 w-4" /> Add Field
              </Button>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Template'}
              </Button>
              <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
