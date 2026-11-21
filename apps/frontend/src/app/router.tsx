// T-006 T-081 All routes in one place (UI-S-001..UI-S-006); everything except /logowanie and shared reports needs a session
import { createBrowserRouter } from 'react-router-dom';

import { setUnauthorizedHandler } from '@/api/client';
import { AppLayout } from '@/components/AppLayout/AppLayout';
import { RequireAuth } from '@/components/RequireAuth/RequireAuth';
import { AccountPage } from '@/pages/Account/AccountPage';
import { FieldCreatePage } from '@/pages/FieldCreate/FieldCreatePage';
import { FieldReportPage } from '@/pages/FieldReport/FieldReportPage';
import { LoginPage } from '@/pages/Login/LoginPage';
import { ProfilePage } from '@/pages/Profile/ProfilePage';
import { NotFoundPage } from '@/pages/NotFound/NotFoundPage';
import { ParcelPage } from '@/pages/Parcel/ParcelPage';
import { ReportPage } from '@/pages/Report/ReportPage';
import { ReportPrintPage } from '@/pages/ReportPrint/ReportPrintPage';
import { StartPage } from '@/pages/Start/StartPage';
import { markSessionExpired, useSessionStore } from '@/store/session';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <StartPage /> },
          { path: '/parcel/:parcelId', element: <ParcelPage /> },
          { path: '/pole/nowe', element: <FieldCreatePage /> },
          { path: '/pole/:fieldId/raport', element: <FieldReportPage /> },
          { path: '/konto', element: <AccountPage /> },
          { path: '/konto/profil', element: <ProfilePage /> },
        ],
      },
      { path: '/report/:id', element: <ReportPage /> },
      { path: '/logowanie', element: <LoginPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/report/:id/print', element: <ReportPrintPage /> },
]);

// T-081 any 401 (expired token) clears the session and sends the user to the login screen; shared reports stay public
// RequireAuth does the redirect once the token is gone; the flag makes the login page show "Zaloguj się ponownie"
setUnauthorizedHandler(() => {
  if (!useSessionStore.getState().token) return;
  if (!window.location.pathname.startsWith('/report/')) markSessionExpired();
  useSessionStore.getState().logout();
});
