// UI-C-014 MemberList: household members with add-by-email form and in-place remove confirmation
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { z } from 'zod';

import type { Member } from '@/api/types';

const emailSchema = z.string().trim().email('Wpisz poprawny adres e-mail, np. jan@gospodarstwo.pl');

export interface MemberListProps {
  members: Member[];
  isLoading: boolean;
  error: { code: string; message: string } | null;
  isAdding: boolean;
  addError: { code: string; message: string } | null;
  removingId: string | null;
  removeError: { code: string; message: string } | null;
  onAdd: (email: string) => void;
  onRemove: (memberId: string) => void;
  onRetry: () => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('pl-PL');
}

export function MemberList({
  members,
  isLoading,
  error,
  isAdding,
  addError,
  removingId,
  removeError,
  onAdd,
  onRemove,
  onRetry,
}: MemberListProps) {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  // Backend refuses removing the last active member (LAST_MEMBER), pending invites don't count
  const isLast = members.filter((member) => member.status === 'active').length <= 1;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Niepoprawny e-mail');
      return;
    }
    setFieldError(null);
    onAdd(parsed.data);
    setEmail('');
  };

  let list;
  if (isLoading) {
    list = (
      <Stack spacing={1} aria-label="Ładowanie członków" role="status">
        {[0, 1].map((key) => (
          <Skeleton key={key} variant="rounded" height={72} />
        ))}
      </Stack>
    );
  } else if (error) {
    list = (
      <Alert
        severity="error"
        role="alert"
        action={
          <Button color="inherit" sx={{ minHeight: 44 }} onClick={onRetry}>
            Spróbuj ponownie
          </Button>
        }
      >
        {error.message}
      </Alert>
    );
  } else {
    list = (
      <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {members.map((member) => {
          const isConfirming = confirmId === member.id;
          return (
            <li key={member.id}>
              <Card sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                      {member.name ?? member.email}
                    </Typography>
                    {member.name && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ overflowWrap: 'anywhere' }}
                      >
                        {member.email}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Dodano {formatDate(member.addedAt)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    {member.status === 'pending' && (
                      <Chip label="czeka na rejestrację" color="warning" size="small" />
                    )}
                    {!isConfirming && (
                      <Button
                        variant="outlined"
                        color="error"
                        disabled={(isLast && member.status === 'active') || removingId !== null}
                        onClick={() => setConfirmId(member.id)}
                        sx={{ minHeight: 44 }}
                      >
                        Usuń
                      </Button>
                    )}
                  </Stack>
                </Box>
                {isConfirming && (
                  <Box
                    role="group"
                    aria-label={`Potwierdź usunięcie: ${member.email}`}
                    sx={{
                      mt: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'kropla.severeBg',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Typography sx={{ flex: '1 1 160px' }}>
                      Usunąć tę osobę z gospodarstwa?
                    </Typography>
                    <Button
                      variant="contained"
                      color="error"
                      disabled={removingId === member.id}
                      onClick={() => {
                        onRemove(member.id);
                        setConfirmId(null);
                      }}
                      sx={{
                        minHeight: 44,
                        background: 'none',
                        bgcolor: 'error.main',
                        color: 'error.contrastText',
                      }}
                    >
                      Tak, usuń
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setConfirmId(null)}
                      sx={{ minHeight: 44 }}
                    >
                      Nie
                    </Button>
                  </Box>
                )}
              </Card>
            </li>
          );
        })}
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {list}
      {isLast && !isLoading && !error && (
        <Typography variant="body2" color="text.secondary">
          Nie można usunąć jedynej osoby w gospodarstwie.
        </Typography>
      )}
      {removeError && (
        <Alert severity="error" role="alert">
          {removeError.code === 'LAST_MEMBER'
            ? 'To ostatnia osoba w gospodarstwie – nie można jej usunąć.'
            : removeError.message}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={1.5}>
          <Typography component="h3" variant="h3">
            Dodaj osobę
          </Typography>
          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={Boolean(fieldError || addError)}
            helperText={
              fieldError ??
              (addError?.code === 'ALREADY_MEMBER'
                ? 'Ta osoba jest już w gospodarstwie albo ma zaproszenie.'
                : addError?.message) ??
              'Jeśli ta osoba nie ma jeszcze konta, dostanie status „czeka na rejestrację”.'
            }
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={<PersonAddIcon />}
            disabled={isAdding}
          >
            {isAdding ? 'Dodaję…' : 'Dodaj'}
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
