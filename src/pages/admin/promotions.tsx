import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { Tag, Plus, Search } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { PromoCodeForm } from '@/components/admin/promo-code-form'

type PromoCode = {
  id: string
  code: string
  type: 'percentage' | 'fixed' | 'trial_extension'
  value: number
  usage_limit: number | null
  usage_count: number
  expires_at: string | null
  description: string | null
  created_at: string
}

export function AdminPromotions() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null)

  const enabled = isFeatureEnabled('ENABLE_ADMIN_PROMOTIONS')

  useEffect(() => {
    if (enabled) {
      fetchPromoCodes()
    }
  }, [enabled])

  async function fetchPromoCodes() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPromoCodes(data || [])
    } catch (error) {
      console.error('Error fetching promo codes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCodes = promoCodes.filter(code =>
    code.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function handleCreateClick() {
    setEditingPromoCode(null)
    setShowForm(true)
  }

  function handleEditClick(promoCode: PromoCode) {
    setEditingPromoCode(promoCode)
    setShowForm(true)
  }

  function handleFormSuccess() {
    fetchPromoCodes()
    setShowForm(false)
    setEditingPromoCode(null)
  }

  if (!enabled) {
    return (
      <div className="min-h-screen bg-background [isolation:isolate] p-6">
        <div className="max-w-7xl mx-auto">
          <EmptyState
            icon={<Tag className="h-12 w-12" />}
            title="Promotions feature disabled"
            description="Enable ENABLE_ADMIN_PROMOTIONS feature flag to use this feature."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background [isolation:isolate] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Promotions</h1>
            <p className="text-muted-foreground mt-1">Manage promo codes and discounts</p>
          </div>
          <Button onClick={handleCreateClick}>
            <Plus className="w-4 h-4 mr-2" />
            Create Promo Code
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search promo codes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Promo Codes List */}
        <Card>
          <CardHeader>
            <CardTitle>Promo Codes ({filteredCodes.length})</CardTitle>
            <CardDescription>All active and expired promo codes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredCodes.length === 0 ? (
              <EmptyState
                icon={<Tag className="h-8 w-8" />}
                title="No promo codes"
                description="Create your first promo code to get started."
              />
            ) : (
              <div className="space-y-2">
                {filteredCodes.map(code => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold text-foreground">{code.code}</span>
                        <Badge variant="outline">{code.type}</Badge>
                        {code.expires_at && new Date(code.expires_at) < new Date() && (
                          <Badge variant="secondary">Expired</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {code.type === 'percentage'
                          ? `${code.value}% off`
                          : code.type === 'fixed'
                            ? `$${code.value} off`
                            : `${code.value} days trial extension`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used {code.usage_count} / {code.usage_limit || '∞'} times
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(code)}>
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Promo Code Form Modal */}
      <PromoCodeForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingPromoCode(null)
        }}
        promoCode={editingPromoCode}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}
