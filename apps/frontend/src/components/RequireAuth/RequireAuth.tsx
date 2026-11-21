// T-081 UI-S-005 RequireAuth: route guard, no session sends the user to /logowanie and remembers the target in state.from
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useSessionStore } from '@/store/session';

export function RequireAuth() {
  const token = useSessionStore((state) => state.token);
  const location = useLocation();
  if (!token) {
    return <Navigate to="/logowanie" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
