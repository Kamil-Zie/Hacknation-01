// T-006 All routes in one place (UI-S-001..UI-S-004)
import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/components/AppLayout/AppLayout';
import { AccountPage } from '@/pages/Account/AccountPage';
import { LoginPage } from '@/pages/Login/LoginPage';
import { NotFoundPage } from '@/pages/NotFound/NotFoundPage';
import { ParcelPage } from '@/pages/Parcel/ParcelPage';
import { ReportPage } from '@/pages/Report/ReportPage';
import { ReportPrintPage } from '@/pages/ReportPrint/ReportPrintPage';
import { StartPage } from '@/pages/Start/StartPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <StartPage /> },
      { path: '/parcel/:parcelId', element: <ParcelPage /> },
      { path: '/report/:id', element: <ReportPage /> },
      { path: '/logowanie', element: <LoginPage /> },
      { path: '/konto', element: <AccountPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/report/:id/print', element: <ReportPrintPage /> },
]);
