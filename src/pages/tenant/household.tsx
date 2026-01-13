import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/empty-state'
import { JoinHouseholdForm } from '@/components/tenant/join-household-form'
import { PropertyDetailsCard } from '@/components/tenant/property-details-card'
import { LandlordContactCard } from '@/components/tenant/landlord-contact-card'
import { HousematesList } from '@/components/tenant/housemates-list'
import { useTenantData } from '@/hooks/use-tenant-data'
import { useAuth } from '@/contexts/auth-context'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Home, Users, FileText } from 'lucide-react'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { useDocuments } from '@/hooks/use-documents'
import { DocumentCard } from '@/components/ui/document-card'

export function TenantHousehold() {
  const { data: tenantData, loading: tenantLoading } = useTenantData()
  const { role } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'home' | 'housemates' | 'documents'>('home')
  const [showJoinForm, setShowJoinForm] = useState(false)

  // Get documents for the property
  const { documents, loading: documentsLoading } = useDocuments(tenantData?.property.id)

  // Role guard: Prevent landlords from accessing tenant household
  useEffect(() => {
    if (role === 'landlord') {
      navigate('/landlord/dashboard', { replace: true })
    }
  }, [role, navigate])

  if (role === 'landlord') {
    return null // Prevent rendering while redirecting
  }

  if (tenantLoading) {
    return (
      <div className="container mx-auto px-4 py-8 relative">
        <GrainOverlay />
        <div className="text-center py-12 relative z-10">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Case 1: Tenant NOT in a household - Show Join Household Interface
  if (!tenantData) {
    return (
      <div className="container mx-auto px-4 py-8 relative min-h-screen">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            transition={{
              duration: durationToSeconds(motionTokens.duration.base),
              ease: motionTokens.ease.standard,
            }}
          >
            <div className="mb-8">
              <h1 className="text-4xl font-semibold text-foreground mb-2">Household</h1>
              <p className="text-muted-foreground">Join a household to access your property information</p>
            </div>

            {showJoinForm ? (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Join Household</CardTitle>
                  <CardDescription>Enter the invite link your landlord sent you</CardDescription>
                </CardHeader>
                <CardContent>
                  <JoinHouseholdForm onCancel={() => setShowJoinForm(false)} />
                </CardContent>
              </Card>
            ) : (
              <EmptyState
                icon={<Home className="h-12 w-12" />}
                title="Not part of a household yet"
                description="You need to join a household to view property information, housemates, and documents. Ask your landlord to send you an invite link."
                action={{
                  label: 'Join with Invite Link',
                  onClick: () => setShowJoinForm(true),
                }}
              />
            )}
          </motion.div>
        </div>
      </div>
    )
  }

  // Case 2: Tenant IS in a household - Show Tabbed Household View
  const activeLease = tenantData.leases?.[0] // Get most recent lease

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
          animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
          transition={{
            duration: durationToSeconds(motionTokens.duration.base),
            ease: motionTokens.ease.standard,
          }}
        >
          <div className="mb-8">
            <h1 className="text-4xl font-semibold text-foreground mb-2">Household</h1>
            <p className="text-muted-foreground">{tenantData.property.name}</p>
          </div>

          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as typeof activeTab)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
              <TabsTrigger value="home" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Home
              </TabsTrigger>
              <TabsTrigger value="housemates" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Housemates
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documents
              </TabsTrigger>
            </TabsList>

            {/* Home Tab */}
            <TabsContent value="home" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: durationToSeconds(motionTokens.duration.base),
                  delay: 0.1,
                }}
                className="grid gap-6 md:grid-cols-2"
              >
                <PropertyDetailsCard property={tenantData.property} lease={activeLease} />
                <LandlordContactCard propertyId={tenantData.property.id} leaseId={activeLease?.id} />
              </motion.div>
            </TabsContent>

            {/* Housemates Tab */}
            <TabsContent value="housemates">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: durationToSeconds(motionTokens.duration.base),
                  delay: 0.1,
                }}
              >
                <HousematesList 
                  propertyId={tenantData.property.id} 
                  currentTenantId={tenantData.tenant.id}
                />
              </motion.div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: durationToSeconds(motionTokens.duration.base),
                  delay: 0.1,
                }}
              >
                <Card className="glass-card relative overflow-hidden">
                  <GrainOverlay />
                  <MatteLayer intensity="subtle" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Property Documents
                    </CardTitle>
                    <CardDescription>Shared documents for your property (read-only)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {documentsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading documents...</p>
                    ) : documents.length === 0 ? (
                      <EmptyState
                        icon={<FileText className="h-8 w-8" />}
                        title="No documents yet"
                        description="Your landlord hasn't uploaded any documents for this property."
                      />
                    ) : (
                      <div className="space-y-3">
                        {documents.map(doc => (
                          <DocumentCard key={doc.id} document={doc} readOnly />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}

