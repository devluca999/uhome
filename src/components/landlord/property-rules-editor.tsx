import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { Eye, EyeOff, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PropertyRulesEditorProps {
  rules: string | null
  rulesVisibleToTenants: boolean
  onSave: (rules: string | null, visibleToTenants: boolean) => Promise<void>
  className?: string
}

export function PropertyRulesEditor({
  rules,
  rulesVisibleToTenants,
  onSave,
  className,
}: PropertyRulesEditorProps) {
  const [editing, setEditing] = useState(false)
  const [rulesContent, setRulesContent] = useState(rules || '')
  const [visibility, setVisibility] = useState(rulesVisibleToTenants)
  const [saving, setSaving] = useState(false)
  const [updatingVisibility, setUpdatingVisibility] = useState(false)

  useEffect(() => {
    if (!editing) {
      setRulesContent(rules || '')
    }
  }, [rules, editing])

  useEffect(() => {
    setVisibility(rulesVisibleToTenants)
  }, [rulesVisibleToTenants])

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(rulesContent.trim() || null, visibility)
      setEditing(false)
    } catch (error) {
      console.error('Error saving rules:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleVisibility() {
    setUpdatingVisibility(true)
    try {
      await onSave(rulesContent.trim() || null, !visibility)
      setVisibility(!visibility)
    } catch (error) {
      console.error('Error updating visibility:', error)
    } finally {
      setUpdatingVisibility(false)
    }
  }

  function handleCancel() {
    setRulesContent(rules || '')
    setEditing(false)
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">House Rules / Notes</h3>
          <p className="text-sm text-muted-foreground">
            {visibility ? 'Visible to tenants' : 'Landlord-only'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {rules && !editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleVisibility}
              disabled={updatingVisibility}
              className={cn(
                'h-auto p-2',
                visibility && 'bg-primary/10 text-primary',
                !visibility && 'text-muted-foreground'
              )}
              aria-label={visibility ? 'Hide from tenants' : 'Show to tenants'}
            >
              {visibility ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
          )}
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              {rules ? 'Edit Rules' : 'Add Rules'}
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <MarkdownEditor
            value={rulesContent}
            onChange={setRulesContent}
            placeholder="Enter house rules (markdown supported)..."
            disabled={saving}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Visible to tenants</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisibility(!visibility)}
                disabled={saving}
                className={cn(
                  'h-auto p-1',
                  visibility && 'bg-primary/10 text-primary',
                  !visibility && 'text-muted-foreground'
                )}
              >
                {visibility ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : rules ? (
        <div className="prose prose-sm dark:prose-invert max-w-none p-4 border border-border rounded-md bg-muted/30">
          <MarkdownRenderer content={rules} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic p-4 border border-border rounded-md bg-muted/30">
          No house rules set. Click "Add Rules" to add rules for this property.
        </p>
      )}
    </div>
  )
}
