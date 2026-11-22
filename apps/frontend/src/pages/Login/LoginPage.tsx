// UI-S-005 T-081 Logowanie i rejestracja jako ekran startowy: logo, jedno zdanie, zakładki Zaloguj się / Załóż konto; po sukcesie powrót do state.from albo Panel (/konto)
import OpacityIcon from '@mui/icons-material/Opacity';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink, Navigate, useLocation, useSearchParams } from 'react-router-dom';

import { useLoginMutation, useRegisterMutation } from '@/api/auth';
import { ApiError } from '@/api/client';
import type { LoginRequest, RegisterRequest } from '@/api/types';
import { AuthForm } from '@/components/AuthForm/AuthForm';
import type { AuthMode } from '@/components/AuthForm/AuthForm';
import { clearSessionExpired, readSessionExpired, useSessionStore } from '@/store/session';
import { errorMessage } from '@/utils/errorMessages';

const PANEL_PATH = '/konto';

// The start page "/" is not a destination worth returning to: after login everyone lands on the dashboard (/konto)
function safePath(path: string | null | undefined): string | null {
  return path &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.startsWith('/logowanie') &&
    path !== '/' &&
    !path.startsWith('/?')
    ? path
    : null;
}

export function LoginPage() {
  const location = useLocation();
  const [params] = useSearchParams();
  const state = location.state as {
    from?: { pathname: string; search?: string };
  } | null;
  const target =
    safePath(state?.from ? state.from.pathname + (state.from.search ?? '') : null) ??
    safePath(params.get('next')) ??
    PANEL_PATH;
  const [expired] = useState(readSessionExpired);
  useEffect(() => clearSessionExpired, []);
  const [mode, setMode] = useState<AuthMode>('login');
  const user = useSessionStore((s) => s.user);
  const token = useSessionStore((s) => s.token);
  const setSession = useSessionStore((s) => s.setSession);
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const mutation = mode === 'register' ? registerMutation : loginMutation;

  if (token && user) return <Navigate to={target} replace />;

  const error =
    mutation.error instanceof ApiError
      ? { code: mutation.error.code, message: errorMessage(mutation.error).message }
      : mutation.error
        ? { code: 'NETWORK_ERROR', message: 'Nie udało się połączyć. Spróbuj ponownie.' }
        : null;

  // the guard above redirects as soon as the session is stored
  const handleSubmit = (values: LoginRequest | RegisterRequest) => {
    if ('name' in values)
      registerMutation.mutate(values, { onSuccess: (session) => setSession(session) });
    else
      loginMutation.mutate(values, {
        onSuccess: (session) => setSession(session, values.rememberMe ?? true),
      });
  };

  const handleModeChange = (value: AuthMode) => {
    loginMutation.reset();
    registerMutation.reset();
    setMode(value);
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 1, md: 6 } }}>
      <Stack spacing={3} sx={{ width: '100%', maxWidth: 480 }}>
        <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <OpacityIcon aria-hidden color="primary" sx={{ fontSize: 56 }} />
          <Typography variant="h1" component="p" sx={{ fontWeight: 800 }}>
            Kropelka
          </Typography>
          <Typography id="login-title" variant="h2" component="h1" sx={{ fontWeight: 600 }}>
            Sprawdź wodę na swojej działce
          </Typography>
        </Stack>
        {expired && (
          <Alert severity="info" role="status" sx={{ fontSize: '1.125rem' }}>
            Zaloguj się ponownie
          </Alert>
        )}
        <Paper
          variant="outlined"
          component="section"
          aria-labelledby="login-title"
          sx={{ p: { xs: 2, md: 4 } }}
        >
          <AuthForm
            mode={mode}
            onModeChange={handleModeChange}
            isLoading={mutation.isPending}
            error={error}
            onSubmit={handleSubmit}
          />
        </Paper>
        {/* guest mode: checking a single parcel needs no account */}
        <Button
          component={RouterLink}
          to="/"
          variant="outlined"
          size="large"
          sx={{ minHeight: 48, fontSize: '1.125rem' }}
        >
          Sprawdź działkę bez logowania
        </Button>
      </Stack>
    </Box>
  );
}
