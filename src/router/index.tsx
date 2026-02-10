import { createBrowserRouter, Outlet } from 'react-router-dom'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/auth/login'
import { SignupPage } from '@/pages/auth/signup'
import { AuthCallback } from '@/pages/auth/callback'
import { AcceptInvite } from '@/pages/auth/accept-invite'
import { PrivacyPolicy } from '@/pages/legal/privacy'
import { TermsOfService } from '@/pages/legal/terms'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { LandlordLayout } from '@/components/layout/landlord-layout'
import { TenantLayout } from '@/components/layout/tenant-layout'
import { LandlordDashboard } from '@/pages/landlord/dashboard'
import { LandlordFinances } from '@/pages/landlord/finances'
import { LandlordProperties } from '@/pages/landlord/properties'
import { LandlordTenants } from '@/pages/landlord/tenants'
import { PropertyDetail } from '@/pages/landlord/property-detail'
import { LandlordOperations } from '@/pages/landlord/operations'
import { LandlordDocuments } from '@/pages/landlord/documents'
import { TenantDashboard } from '@/pages/tenant/dashboard'
import { TenantHousehold } from '@/pages/tenant/household'
import { TenantMaintenance } from '@/pages/tenant/maintenance'
import { TenantDocuments } from '@/pages/tenant/documents'
import { TenantFinances } from '@/pages/tenant/finances'
import { TenantMessages } from '@/pages/tenant/messages'
import { TenantLeaseDetail } from '@/pages/tenant/lease-detail'
import { TenantPayRent } from '@/pages/tenant/pay-rent'
import { LandlordMessages } from '@/pages/landlord/messages'
import { LeaseDetail } from '@/pages/landlord/lease-detail'
import { SettingsPage } from '@/pages/settings'
import { DevBypass } from '@/pages/dev/bypass'
import { ErrorPage } from '@/components/error-page'
import { ProvidersWrapper } from '@/components/providers-wrapper'
import { AdminLayout } from '@/components/layout/admin-layout'
import { AdminOverview } from '@/pages/admin/overview'
import { AdminUsers } from '@/pages/admin/users'
// import { AdminConversations } from '@/pages/admin/conversations' // Unused
// import { AdminSupport } from '@/pages/admin/support' // Unused
import { AdminMessagesSupport } from '@/pages/admin/messages-support'
import { AdminSystem } from '@/pages/admin/system'
import { AdminPerformance } from '@/pages/admin/performance'
import { AdminPayments } from '@/pages/admin/payments'
import { AdminAuditSecurity } from '@/pages/admin/audit-security'
import { AdminWaitlist } from '@/pages/admin/waitlist'
import { AdminPromotions } from '@/pages/admin/promotions'
import { AdminNewsletter } from '@/pages/admin/newsletter'
import { AdminLeads } from '@/pages/admin/leads'
import { AdminReleases } from '@/pages/admin/releases'
import { LeadUpload } from '@/pages/admin/leads/upload'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: (
        <ProvidersWrapper>
          <Outlet />
        </ProvidersWrapper>
      ),
      errorElement: <ErrorPage />,
      children: [
        {
          index: true,
          element: <HomePage />,
        },
        {
          path: 'login',
          element: <LoginPage />,
        },
        {
          path: 'signup',
          element: <SignupPage />,
        },
        {
          path: 'auth/callback',
          element: <AuthCallback />,
        },
        {
          path: 'accept-invite/:token',
          element: <AcceptInvite />,
        },
        {
          path: 'privacy',
          element: <PrivacyPolicy />,
        },
        {
          path: 'terms',
          element: <TermsOfService />,
        },
        {
          path: 'dev/bypass',
          element: <DevBypass />,
        },
        {
          path: 'landlord',
          element: (
            <ProtectedRoute allowedRoles={['landlord']}>
              <LandlordLayout />
            </ProtectedRoute>
          ),
          children: [
            {
              path: 'dashboard',
              element: <LandlordDashboard />,
            },
            {
              path: 'finances',
              element: <LandlordFinances />,
            },
            {
              path: 'properties',
              element: <LandlordProperties />,
            },
            {
              path: 'properties/:id',
              element: <PropertyDetail />,
            },
            {
              path: 'leases/:leaseId',
              element: <LeaseDetail />,
            },
            {
              path: 'tenants',
              element: <LandlordTenants />,
            },
            {
              path: 'operations',
              element: <LandlordOperations />,
            },
            {
              path: 'documents',
              element: <LandlordDocuments />,
            },
            {
              path: 'messages',
              element: <LandlordMessages />,
            },
            {
              path: 'messages/:leaseId',
              element: <LandlordMessages />,
            },
            {
              path: 'settings',
              element: <SettingsPage />,
            },
          ],
        },
        {
          path: 'tenant',
          element: (
            <ProtectedRoute allowedRoles={['tenant']}>
              <TenantLayout />
            </ProtectedRoute>
          ),
          children: [
            {
              path: 'dashboard',
              element: <TenantDashboard />,
            },
            {
              path: 'household',
              element: <TenantHousehold />,
            },
            {
              path: 'maintenance',
              element: <TenantMaintenance />,
            },
            {
              path: 'documents',
              element: <TenantDocuments />,
            },
            {
              path: 'finances',
              element: <TenantFinances />,
            },
            {
              path: 'pay-rent/:recordId',
              element: <TenantPayRent />,
            },
            {
              path: 'messages',
              element: <TenantMessages />,
            },
            {
              path: 'messages/:leaseId',
              element: <TenantMessages />,
            },
            {
              path: 'lease',
              element: <TenantLeaseDetail />,
            },
            {
              path: 'settings',
              element: <SettingsPage />,
            },
          ],
        },
        {
          path: 'admin',
          element: (
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          ),
          children: [
            {
              path: 'overview',
              element: <AdminOverview />,
            },
            {
              path: 'users',
              element: <AdminUsers />,
            },
            {
              path: 'messages-support',
              element: <AdminMessagesSupport />,
            },
            // Legacy routes - redirect to merged page
            {
              path: 'conversations',
              element: <AdminMessagesSupport />,
            },
            {
              path: 'support',
              element: <AdminMessagesSupport />,
            },
            {
              path: 'payments',
              element: <AdminPayments />,
            },
            {
              path: 'audit-security',
              element: <AdminAuditSecurity />,
            },
            {
              path: 'system',
              element: <AdminSystem />,
            },
            {
              path: 'performance',
              element: <AdminPerformance />,
            },
            {
              path: 'waitlist',
              element: <AdminWaitlist />,
            },
            {
              path: 'promotions',
              element: <AdminPromotions />,
            },
            {
              path: 'newsletter',
              element: <AdminNewsletter />,
            },
            {
              path: 'leads',
              element: <AdminLeads />,
            },
            {
              path: 'leads/upload',
              element: <LeadUpload />,
            },
            {
              path: 'releases',
              element: <AdminReleases />,
            },
          ],
        },
      ],
    },
    {
      path: '*',
      element: <ErrorPage />,
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  }
)
