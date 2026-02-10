import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { Package, RotateCcw, GitBranch, Calendar, User } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'

type AppRelease = {
  id: string
  version: string
  codename: string | null
  commit_hash: string
  deployed_at: string
  deployed_by: string | null
  status: 'active' | 'rolled_back' | 'pending' | 'superseded'
  release_notes: string | null
  is_active: boolean
  environment: 'staging' | 'production'
  deployed_by_user?: {
    email: string
  }
}

export function AdminReleases() {
  const { user } = useAuth()
  const [releases, setReleases] = useState<AppRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [environment, setEnvironment] = useState<'staging' | 'production'>('production')

  const enabled = isFeatureEnabled('ENABLE_RELEASE_TRACKING')

  useEffect(() => {
    if (enabled) {
      fetchReleases()
    }
  }, [enabled, environment])

  async function fetchReleases() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('app_releases')
        .select(
          `
          *,
          deployed_by_user:users!app_releases_deployed_by_fkey(email)
        `
        )
        .eq('environment', environment)
        .order('deployed_at', { ascending: false })

      if (error) throw error

      // Map the nested structure
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        deployed_by_user: item.deployed_by_user || undefined,
      }))

      setReleases(mappedData)
    } catch (error) {
      console.error('Error fetching releases:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRollback(releaseId: string) {
    if (!user) return

    const release = releases.find(r => r.id === releaseId)
    if (!release) return

    // Safety checks
    if (release.status === 'rolled_back') {
      alert('This release has already been rolled back.')
      return
    }

    if (release.is_active && release.status === 'active') {
      const confirmed = confirm(
        `Are you sure you want to rollback release ${release.version}? This will disable feature flags introduced in this release.`
      )
      if (!confirmed) return
    }

    try {
      // Update release status
      const { error: updateError } = await supabase
        .from('app_releases')
        .update({
          status: 'rolled_back',
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', releaseId)

      if (updateError) throw updateError

      // Disable feature flags introduced in this release
      const { error: flagsError } = await supabase
        .from('feature_flags')
        .update({
          enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('release_id', releaseId)
        .eq('environment', environment)

      if (flagsError) {
        console.warn('Error disabling feature flags:', flagsError)
        // Continue - flag update failure shouldn't block rollback
      }

      // Log rollback event
      await supabase.from('release_events').insert({
        release_id: releaseId,
        action: 'rollback',
        actor: user.id,
        reason: `Rolled back release ${release.version}`,
        environment,
        metadata: {
          version: release.version,
          previous_status: release.status,
        },
      })

      // Refresh releases
      await fetchReleases()
    } catch (error) {
      console.error('Error rolling back release:', error)
      alert('Failed to rollback release. Please check console for details.')
    }
  }

  if (!enabled) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <EmptyState
            icon={<Package className="h-12 w-12" />}
            title="Release tracking disabled"
            description="Enable ENABLE_RELEASE_TRACKING feature flag to use this feature."
          />
        </div>
      </div>
    )
  }

  const activeRelease = releases.find(r => r.is_active && r.status === 'active')

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Releases</h1>
            <p className="text-muted-foreground mt-1">
              Track application versions and manage rollbacks
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={environment}
              onChange={e => setEnvironment(e.target.value as 'staging' | 'production')}
              className="h-10 px-3 rounded-md border border-input bg-background"
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
            </select>
          </div>
        </div>

        {/* Active Release Banner */}
        {activeRelease && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">Active Release</Badge>
                    <span className="font-semibold text-foreground">{activeRelease.version}</span>
                    {activeRelease.codename && (
                      <span className="text-muted-foreground">({activeRelease.codename})</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Deployed {new Date(activeRelease.deployed_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleRollback(activeRelease.id)}
                  className="text-destructive"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Rollback
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Releases List */}
        <Card>
          <CardHeader>
            <CardTitle>Release History ({releases.length})</CardTitle>
            <CardDescription>
              All releases for {environment === 'production' ? 'production' : 'staging'} environment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : releases.length === 0 ? (
              <EmptyState
                icon={<Package className="h-8 w-8" />}
                title="No releases"
                description="Releases will appear here once deployments are recorded."
              />
            ) : (
              <div className="space-y-4">
                {releases.map(release => (
                  <div
                    key={release.id}
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-foreground">{release.version}</span>
                          {release.codename && (
                            <span className="text-muted-foreground">({release.codename})</span>
                          )}
                          <Badge
                            variant={
                              release.status === 'active'
                                ? 'default'
                                : release.status === 'rolled_back'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {release.status}
                          </Badge>
                          {release.is_active && (
                            <Badge variant="default" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            <span className="font-mono text-xs">{release.commit_hash.substring(0, 7)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(release.deployed_at).toLocaleString()}</span>
                          </div>
                          {release.deployed_by_user && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{release.deployed_by_user.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {release.status === 'active' && !release.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRollback(release.id)}
                          className="text-destructive"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Rollback
                        </Button>
                      )}
                    </div>
                    {release.release_notes && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <MarkdownRenderer content={release.release_notes} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
