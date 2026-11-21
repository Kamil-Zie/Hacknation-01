// UI-S-005 Logowanie i rejestracja: AuthForm in a centered card, redirect to ?next= after success
import { Box, Button, Link, Paper, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';

import { useLoginMutation, useRegisterMutation } from '@/api/auth';
import { ApiError } from '@/api/client';
import type { LoginRequest, RegisterRequest, Session } from '@/api/types';
import { AuthForm } from '@/components/AuthForm/AuthForm';
import type { AuthMode } from '@/components/AuthForm/AuthForm';
import { useSessionStore } from '@/store/session';
import { errorMessage } from '@/utils/errorMessages';

function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [mode, setMode] = useState<AuthMode>('login');
  const user = useSessionStore((state) => state.user);
  const token = useSessionStore((state) => state.token);
  const setSession = useSessionStore((state) => state.setSession);
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const mutation = mode === 'register' ? registerMutation : loginMutation;

  const error =
    mutation.error instanceof ApiError
      ? { code: mutation.error.code, message: errorMessage(mutation.error).message }
      : mutation.error
        ? { code: 'NETWORK_ERROR', message: 'Nie udało się połączyć. Spróbuj ponownie.' }
        : null;

  const handleSuccess = (session: Session, rememberMe = true) => {
    setSession(session, rememberMe);
    navigate(next, { replace: true });
  };

  const handleSubmit = (values: LoginRequest | RegisterRequest) => {
    if ('name' in values) registerMutation.mutate(values, { onSuccess: (s) => handleSuccess(s) });
    else
      loginMutation.mutate(values, {
        onSuccess: (s) => handleSuccess(s, values.rememberMe ?? true),
      });
  };

  const handleModeChange = (value: AuthMode) => {
    loginMutation.reset();
    registerMutation.reset();
    setMode(value);
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 0, md: 4 } }}>
      <Paper
        variant="outlined"
        component="section"
        aria-labelledby="login-title"
        sx={{ width: '100%', maxWidth: 440, p: { xs: 2, md: 4 } }}
      >
        {token && user ? (
          <Stack spacing={2}>
            <Typography id="login-title" variant="h2" component="h1">
              Jesteś zalogowany jako {user.name}
            </Typography>
            <Button
              component={RouterLink}
              to="/"
              variant="contained"
              size="large"
              sx={{ minHeight: 44 }}
            >
              Wróć do sprawdzania działki
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography id="login-title" variant="h2" component="h1">
              {mode === 'register' ? 'Załóż konto' : 'Zaloguj się'}
            </Typography>
            <AuthForm
              mode={mode}
              onModeChange={handleModeChange}
              isLoading={mutation.isPending}
              error={error}
              onSubmit={handleSubmit}
            />
            <Link
              component={RouterLink}
              to="/"
              underline="hover"
              sx={{
                alignSelf: 'center',
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 44,
              }}
            >
              Kontynuuj bez konta
            </Link>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
