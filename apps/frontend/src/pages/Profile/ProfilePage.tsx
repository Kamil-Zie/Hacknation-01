// UI-S-006 API-015 Mój profil: change name, e-mail and password (PATCH /auth/me), errors at fields, name updates the account menu at once
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link as RouterLink, Navigate, useLocation } from 'react-router-dom';
import { z } from 'zod';

import { useUpdateProfileMutation } from '@/api/auth';
import { ApiError } from '@/api/client';
import type { UpdateProfileRequest, User } from '@/api/types';
import { useSessionStore } from '@/store/session';

const detailsSchema = z.object({
  name: z.string().trim().min(1, 'Podaj imię').max(80, 'Imię może mieć najwyżej 80 znaków'),
  email: z.string().trim().min(1, 'Podaj e-mail').email('Podaj poprawny adres e-mail'),
  currentPassword: z.string(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Podaj obecne hasło'),
    newPassword: z.string().min(8, 'Nowe hasło musi mieć co najmniej 8 znaków'),
    repeatPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.repeatPassword, {
    path: ['repeatPassword'],
    message: 'Hasła nie są takie same',
  });

type DetailsValues = z.infer<typeof detailsSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

// API error -> { field, message } so it can be shown under the right input
function fieldError(error: unknown): { field: string; message: string } | null {
  if (!error) return null;
  if (error instanceof ApiError) {
    if (error.code === 'INVALID_CREDENTIALS') {
      return { field: 'currentPassword', message: 'To nie jest Twoje obecne hasło' };
    }
    if (error.code === 'EMAIL_TAKEN') {
      return { field: 'email', message: 'Konto z tym adresem e-mail już istnieje' };
    }
    const field = error.details?.field;
    if (error.code === 'VALIDATION_ERROR' && typeof field === 'string') {
      return { field, message: error.message };
    }
    return { field: '', message: error.message };
  }
  return { field: '', message: 'Nie udało się połączyć. Spróbuj ponownie.' };
}

interface PasswordInputProps {
  label: string;
  autoComplete: string;
  error?: string;
  disabled?: boolean;
  field: { value: string; onChange: (...args: unknown[]) => void; onBlur: () => void };
  inputRef?: React.Ref<unknown>;
}

// Password input with a visible text toggle ("Pokaż" / "Ukryj"), not only an icon
function PasswordInput({
  label,
  autoComplete,
  error,
  disabled,
  field,
  inputRef,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
      <TextField
        {...field}
        inputRef={inputRef}
        type={visible ? 'text' : 'password'}
        label={label}
        fullWidth
        autoComplete={autoComplete}
        disabled={disabled}
        error={Boolean(error)}
        helperText={error}
        slotProps={{ formHelperText: { role: error ? 'alert' : undefined } }}
      />
      <Button
        variant="outlined"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        sx={{ minHeight: 56, minWidth: 96, flexShrink: 0 }}
      >
        {visible ? 'Ukryj' : 'Pokaż'}
      </Button>
    </Stack>
  );
}

function DetailsForm({ user, token }: { user: User; token: string }) {
  const setUser = useSessionStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const mutation = useUpdateProfileMutation(token);
  const [saved, setSaved] = useState(false);
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: user.name, email: user.email, currentPassword: '' },
  });
  const emailChanged = watch('email').trim().toLowerCase() !== user.email;
  const apiError = fieldError(mutation.error);
  const errorFor = (field: string) =>
    errors[field as keyof DetailsValues]?.message ??
    (apiError?.field === field ? apiError.message : undefined);

  const onSubmit = (values: DetailsValues) => {
    setSaved(false);
    const body: UpdateProfileRequest = {};
    if (values.name.trim() !== user.name) body.name = values.name.trim();
    if (emailChanged) {
      body.email = values.email.trim();
      body.currentPassword = values.currentPassword;
    }
    if (Object.keys(body).length === 0) {
      setSaved(true);
      return;
    }
    mutation.mutate(body, {
      onSuccess: (updated) => {
        setUser(updated);
        void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        reset({ name: updated.name, email: updated.email, currentPassword: '' });
        setSaved(true);
      },
    });
  };

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-labelledby="profile-details"
      sx={{ p: { xs: 2, md: 3 } }}
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <Typography id="profile-details" variant="h3" component="h2">
            Twoje dane
          </Typography>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Imię"
                fullWidth
                autoComplete="name"
                disabled={mutation.isPending}
                error={Boolean(errorFor('name'))}
                helperText={errorFor('name')}
                slotProps={{ formHelperText: { role: errorFor('name') ? 'alert' : undefined } }}
              />
            )}
          />
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="email"
                label="E-mail"
                fullWidth
                autoComplete="email"
                disabled={mutation.isPending}
                error={Boolean(errorFor('email'))}
                helperText={errorFor('email')}
                slotProps={{ formHelperText: { role: errorFor('email') ? 'alert' : undefined } }}
              />
            )}
          />
          {emailChanged && (
            <Controller
              name="currentPassword"
              control={control}
              render={({ field, fieldState }) => (
                <PasswordInput
                  label="Obecne hasło (potrzebne do zmiany e-maila)"
                  autoComplete="current-password"
                  disabled={mutation.isPending}
                  error={
                    fieldState.error?.message ??
                    (apiError?.field === 'currentPassword' ? apiError.message : undefined)
                  }
                  field={field as PasswordInputProps['field']}
                  inputRef={field.ref}
                />
              )}
            />
          )}
          {apiError?.field === '' && <Alert severity="error">{apiError.message}</Alert>}
          {saved && !mutation.isPending && (
            <Alert severity="success" role="status">
              Zapisano. Twoje dane są aktualne.
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={mutation.isPending}
            sx={{ alignSelf: { sm: 'flex-start' }, minHeight: 56 }}
          >
            {mutation.isPending ? 'Zapisuję…' : 'Zapisz dane'}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}

function PasswordForm({ token }: { token: string }) {
  const mutation = useUpdateProfileMutation(token);
  const [saved, setSaved] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', repeatPassword: '' },
  });
  const apiError = fieldError(mutation.error);
  const errorFor = (field: keyof PasswordValues) =>
    errors[field]?.message ?? (apiError?.field === field ? apiError.message : undefined);

  const onSubmit = (values: PasswordValues) => {
    setSaved(false);
    mutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          reset();
          setSaved(true);
        },
        onError: (error) => {
          const mapped = fieldError(error);
          if (mapped?.field === 'currentPassword') {
            setError('currentPassword', { message: mapped.message });
          }
        },
      },
    );
  };

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-labelledby="profile-password"
      sx={{ p: { xs: 2, md: 3 } }}
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <Typography id="profile-password" variant="h3" component="h2">
            Zmiana hasła
          </Typography>
          <Controller
            name="currentPassword"
            control={control}
            render={({ field }) => (
              <PasswordInput
                label="Obecne hasło"
                autoComplete="current-password"
                disabled={mutation.isPending}
                error={errorFor('currentPassword')}
                field={field as PasswordInputProps['field']}
                inputRef={field.ref}
              />
            )}
          />
          <Controller
            name="newPassword"
            control={control}
            render={({ field }) => (
              <PasswordInput
                label="Nowe hasło (min. 8 znaków)"
                autoComplete="new-password"
                disabled={mutation.isPending}
                error={errorFor('newPassword')}
                field={field as PasswordInputProps['field']}
                inputRef={field.ref}
              />
            )}
          />
          <Controller
            name="repeatPassword"
            control={control}
            render={({ field }) => (
              <PasswordInput
                label="Powtórz nowe hasło"
                autoComplete="new-password"
                disabled={mutation.isPending}
                error={errorFor('repeatPassword')}
                field={field as PasswordInputProps['field']}
                inputRef={field.ref}
              />
            )}
          />
          {apiError?.field === '' && <Alert severity="error">{apiError.message}</Alert>}
          {saved && !mutation.isPending && (
            <Alert severity="success" role="status">
              Hasło zostało zmienione.
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={mutation.isPending}
            sx={{ alignSelf: { sm: 'flex-start' }, minHeight: 56 }}
          >
            {mutation.isPending ? 'Zapisuję…' : 'Zmień hasło'}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}

export function ProfilePage() {
  const location = useLocation();
  const token = useSessionStore((state) => state.token);
  const user = useSessionStore((state) => state.user);

  if (!token || !user) {
    return <Navigate to={`/logowanie?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 640, mx: 'auto' }}>
      <Stack spacing={1}>
        <Typography variant="h2" component="h1">
          Mój profil
        </Typography>
        <Button
          component={RouterLink}
          to="/konto"
          sx={{ alignSelf: 'flex-start', minHeight: 48, px: 0 }}
        >
          Wróć do panelu gospodarstwa
        </Button>
      </Stack>
      <DetailsForm key={user.id} user={user} token={token} />
      <PasswordForm token={token} />
    </Stack>
  );
}
