import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/auth/login'
import { SignupPage } from '@/pages/auth/signup'
import { AuthCallback } from '@/pages/auth/callback'
import { AcceptInvite } from '@/pages/auth/accept-invite'
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
import { TenantMaintenance } from '@/pages/tenant/maintenance'
import { TenantDocuments } from '@/pages/tenant/documents'
import { SettingsPage } from '@/pages/settings'
import { DevBypass } from '@/pages/dev/bypass'
import { ErrorPage } from '@/components/error-page'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <HomePage />,
      errorElement: <ErrorPage />,
    },
    {
      path: '/login',
      element: <LoginPage />,
      errorElement: <ErrorPage />,
    },
    {
      path: '/signup',
      element: <SignupPage />,
      errorElement: <ErrorPage />,
    },
    {
      path: '/auth/callback',
      element: <AuthCallback />,
      errorElement: <ErrorPage />,
    },
    {
      path: '/accept-invite/:token',
      element: <AcceptInvite />,
      errorElement: <ErrorPage />,
    },
    {
      path: '/dev/bypass',
      element: <DevBypass />,
      errorElement: <ErrorPage />,
    },
    {
      path: '/landlord',
      element: (
        <ProtectedRoute allowedRoles={['landlord']}>
          <LandlordLayout />
        </ProtectedRoute>
      ),
      errorElement: <ErrorPage />,
      children: [
        {
          path: 'dashboard',
          element: <LandlordDashboard />,
          errorElement: <ErrorPage />,
        },
        {
          path: 'finances',
          element: <LandlordFinances />,
          errorElement: <ErrorPage />,
        },
        {
          path: 'properties',
          element: <LandlordProperties />,
          errorElement: <ErrorPage />,
        },
        {
          path: 'properties/:id',
          element: <PropertyDetail />,
          errorElement: <ErrorPage />,
        },
        {
          path: 'tenants',
          element: <LandlordTenants />,
          errorElement: <ErrorPage />,
        },
        {
          path: 'operations',
          element: <LandlordOperations />,
          errorElement: <ErrorPage />,
        },
        {
          path: 'documents',
          element: <LandlordDocuments />,
          errorElement: <ErrorPage />,
        },
        {
          path: 'settings',
          element: <SettingsPage />,
          errorElement: <ErrorPage />,
        },
      ],
    },
    {
      path: '/tenant',
      element: (
        <ProtectedRoute allowedRoles={['tenant']}>
          <TenantLayout />
        </ProtectedRoute>
      ),
      errorElement: <ErrorPage />,
      children: [
        {
          path: 'dashboard',
          element: <TenantDashboard />,
          errorElement: <ErrorPage />,
        },
        {
          path: 'maintenance',
          element: <TenantMaintenance />,
          errorElement: <ErrorPage />,
        },
        {
          path: 'documents',
          element: <TenantDocuments />,
          errorElement: <ErrorPage />,
        },
        {
          path: 'settings',
          element: <SettingsPage />,
          errorElement: <ErrorPage />,
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
      v7_startTransition: true,
    },
  }
)
