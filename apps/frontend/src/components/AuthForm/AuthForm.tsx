// UI-C-013 AuthForm: login / register switch, e-mail, password, name (register only), API errors at fields (RHF + Zod)
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import type { LoginRequest, RegisterRequest } from '@/api/types';
import { loginSchema, registerSchema } from '@/components/AuthForm/AuthForm.schema';
import type { AuthFormValues } from '@/components/AuthForm/AuthForm.schema';

export type AuthMode = 'login' | 'register';

interface AuthFormProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  isLoading?: boolean;
  error?: { code: string; message: string } | null;
  onSubmit: (values: LoginRequest | RegisterRequest) => void;
}

export function AuthForm({
  mode,
  onModeChange,
  isLoading = false,
  error = null,
  onSubmit,
}: AuthFormProps) {
  const isRegister = mode === 'register';
  const {
    control,
    handleSubmit,
    setFocus,
    clearErrors,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: { email: '', password: '', name: '', accountName: '', rememberMe: true },
  });

  useEffect(() => {
    clearErrors();
    setFocus(isRegister ? 'name' : 'email');
  }, [isRegister, clearErrors, setFocus]);

  const emailError =
    errors.email?.message ??
    (error?.code === 'EMAIL_TAKEN' ? 'Konto z tym e-mailem już istnieje' : undefined);
  const passwordError =
    errors.password?.message ??
    (error?.code === 'INVALID_CREDENTIALS' ? 'Nieprawidłowy e-mail lub hasło' : undefined);
  const showAlert = error && error.code !== 'EMAIL_TAKEN' && error.code !== 'INVALID_CREDENTIALS';

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) =>
        onSubmit(
          isRegister
            ? {
                email: values.email,
                password: values.password,
                name: values.name ?? '',
                ...(values.accountName?.trim() ? { accountName: values.accountName.trim() } : {}),
              }
            : {
                email: values.email,
                password: values.password,
                rememberMe: values.rememberMe ?? true,
              },
        ),
      )}
    >
      <Stack spacing={2}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          color="primary"
          value={mode}
          disabled={isLoading}
          aria-label="Tryb"
          onChange={(_, value: AuthMode | null) => value && onModeChange(value)}
        >
          <ToggleButton value="login" sx={{ minHeight: 52, fontSize: '1.125rem' }}>
            Zaloguj się
          </ToggleButton>
          <ToggleButton value="register" sx={{ minHeight: 52, fontSize: '1.125rem' }}>
            Załóż konto
          </ToggleButton>
        </ToggleButtonGroup>
        {isRegister && (
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Twoje imię"
                fullWidth
                required
                autoComplete="name"
                disabled={isLoading}
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
                FormHelperTextProps={{ role: errors.name ? 'alert' : undefined }}
              />
            )}
          />
        )}
        {isRegister && (
          <Controller
            name="accountName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Nazwa gospodarstwa (opcjonalnie)"
                placeholder="np. Gospodarstwo Kowalscy"
                helperText={errors.accountName?.message ?? 'np. Gospodarstwo Kowalscy'}
                fullWidth
                disabled={isLoading}
                error={Boolean(errors.accountName)}
                slotProps={{ htmlInput: { maxLength: 120 } }}
                FormHelperTextProps={{ role: errors.accountName ? 'alert' : undefined }}
              />
            )}
          />
        )}
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              type="email"
              label="E-mail"
              fullWidth
              required
              autoComplete="email"
              disabled={isLoading}
              error={Boolean(emailError)}
              helperText={emailError}
              FormHelperTextProps={{ role: emailError ? 'alert' : undefined }}
            />
          )}
        />
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              type="password"
              label="Hasło"
              fullWidth
              required
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              disabled={isLoading}
              error={Boolean(passwordError)}
              helperText={passwordError}
              FormHelperTextProps={{ role: passwordError ? 'alert' : undefined }}
            />
          )}
        />
        {!isRegister && (
          <Controller
            name="rememberMe"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                label="Zapamiętaj mnie"
                disabled={isLoading}
                sx={{
                  minHeight: 48,
                  m: 0,
                  '& .MuiFormControlLabel-label': { fontSize: '1.125rem' },
                }}
                control={
                  <Checkbox
                    checked={field.value ?? true}
                    onChange={(event) => field.onChange(event.target.checked)}
                    inputRef={field.ref}
                    onBlur={field.onBlur}
                    sx={{ p: 1.5, '& .MuiSvgIcon-root': { fontSize: 32 } }}
                  />
                }
              />
            )}
          />
        )}
        {showAlert && <Alert severity="error">{error.message}</Alert>}
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{ minHeight: 44 }}
        >
          {isLoading ? 'Chwileczkę…' : isRegister ? 'Załóż konto' : 'Zaloguj'}
        </Button>
      </Stack>
    </form>
  );
}
