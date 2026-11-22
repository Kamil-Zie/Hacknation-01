// T-104 Route guard: pages that change the account (add parcel, create field, quick report) open only for owner and partner;
// member and guest (view only) are sent back to the dashboard
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useCanEdit } from '@/store/session';

export function EditOnly({ children }: { children: ReactNode }) {
  return useCanEdit() ? children : <Navigate to="/konto" replace />;
}
