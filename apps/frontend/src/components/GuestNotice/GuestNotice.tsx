// UI-S-005 GuestNotice: guest mode info "Nie jesteś zalogowany" with a login link that returns to the current page
import { Alert, Link } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { useSessionStore } from '@/store/session';

export interface GuestNoticeProps {
  /** What a login would add here, e.g. "aby zapisać działkę jako swoją" */
  children: string;
}

/** Shown only to guests (no session); renders nothing for a logged-in user */
export function GuestNotice({ children }: GuestNoticeProps) {
  const token = useSessionStore((state) => state.token);
  const { pathname, search } = useLocation();
  if (token) return null;
  return (
    <Alert severity="info" className="no-print" sx={{ fontSize: '1.0625rem' }}>
      <strong>Nie jesteś zalogowany.</strong>{' '}
      <Link
        component={RouterLink}
        to={`/logowanie?next=${encodeURIComponent(pathname + search)}`}
        sx={{ fontWeight: 700 }}
      >
        Zaloguj się
      </Link>
      , {children}
    </Alert>
  );
}
