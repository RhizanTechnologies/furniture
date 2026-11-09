import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { ShowroomPage } from '@/pages/ShowroomPage';
import { HealthPage } from '@/pages/HealthPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
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
