import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/auth/login'
import { SignupPage } from '@/pages/auth/signup'
import { AuthCallback } from '@/pages/auth/callback'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { LandlordLayout } from '@/components/layout/landlord-layout'
import { TenantLayout } from '@/components/layout/tenant-layout'
import { LandlordDashboard } from '@/pages/landlord/dashboard'
import { LandlordProperties } from '@/pages/landlord/properties'
import { LandlordTenants } from '@/pages/landlord/tenants'
import { PropertyDetail } from '@/pages/landlord/property-detail'
import { LandlordMaintenance } from '@/pages/landlord/maintenance'
import { LandlordDocuments } from '@/pages/landlord/documents'
import { TenantDashboard } from '@/pages/tenant/dashboard'
import { TenantMaintenance } from '@/pages/tenant/maintenance'
import { TenantDocuments } from '@/pages/tenant/documents'
import { DevBypass } from '@/pages/dev/bypass'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />,
  },
  {
    path: '/dev/bypass',
    element: <DevBypass />,
  },
  {
    path: '/landlord',
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
        path: 'properties',
        element: <LandlordProperties />,
      },
      {
        path: 'properties/:id',
        element: <PropertyDetail />,
      },
      {
        path: 'tenants',
        element: <LandlordTenants />,
      },
      {
        path: 'maintenance',
        element: <LandlordMaintenance />,
      },
      {
        path: 'documents',
        element: <LandlordDocuments />,
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
    children: [
      {
        path: 'dashboard',
        element: <TenantDashboard />,
      },
      {
        path: 'maintenance',
        element: <TenantMaintenance />,
      },
      {
        path: 'documents',
        element: <TenantDocuments />,
      },
    ],
  },
])
