// UI-C-016 API-011 PartnerAddForm: add a partner by e-mail (pending status when the person has no account yet)
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Wpisz poprawny adres e-mail, np. jan@gospodarstwo.pl');

export interface PartnerAddFormProps {
  isAdding: boolean;
  addError: { code: string; message: string } | null;
  onAdd: (email: string) => void;
}

export function PartnerAddForm({ isAdding, addError, onAdd }: PartnerAddFormProps) {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

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

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={1.5}>
        <Typography component="h2" variant="h2">
          Dodaj wspólnika
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
          sx={{ minHeight: 48 }}
        >
          {isAdding ? 'Dodaję…' : 'Dodaj'}
        </Button>
      </Stack>
    </Box>
  );
}
