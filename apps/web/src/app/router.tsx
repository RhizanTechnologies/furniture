import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardPage } from '@/pages/DashboardPage';
import { BranchesPage } from '@/pages/BranchesPage';
import { CatalogPage } from '@/pages/CatalogPage';
import { MyBranchPage } from '@/pages/MyBranchPage';
import { ShowroomPage } from '@/pages/ShowroomPage';
import { HealthPage } from '@/pages/HealthPage';
import { LoginPage } from '@/pages/LoginPage';
import { UserRole } from '@furniture/shared';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'catalog',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.OWNER]}>
            <CatalogPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'branches',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.OWNER]}>
            <BranchesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'my-branch',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.BRANCH_ADMIN]}>
            <MyBranchPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'showroom',
        element: <ShowroomPage />,
      },
      {
        path: 'system-health',
        element: <HealthPage />,
      },
    ],
  },
]);
