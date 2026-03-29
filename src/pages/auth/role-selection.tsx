import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase/client'

export function RoleSelection() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  async function handleSelect(role: 'landlord' | 'tenant') {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', user.id)
    if (!error) {
      navigate(role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard', { replace: true })
    } else {
      console.error('[RoleSelection] Failed to set role:', error)
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">Welcome to uhome</h1>
          <p className="text-muted-foreground mt-2">How will you use uhome?</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleSelect('landlord')}
            disabled={saving}
            className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-50"
          >
            <span className="text-3xl">🏠</span>
            <span className="font-medium text-foreground">I'm a Landlord</span>
            <span className="text-xs text-muted-foreground text-center">I manage properties and tenants</span>
          </button>
          <button
            onClick={() => handleSelect('tenant')}
            disabled={saving}
            className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-50"
          >
            <span className="text-3xl">🔑</span>
            <span className="font-medium text-foreground">I'm a Tenant</span>
            <span className="text-xs text-muted-foreground text-center">I rent a property</span>
          </button>
        </div>
        {saving && <p className="text-center text-sm text-muted-foreground">Saving...</p>}
      </div>
    </div>
  )
}
