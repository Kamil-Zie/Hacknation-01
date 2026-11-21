// UI-C-016 API-021 ParcelAccessEditor: choose all parcels or selected parcels for one partner and save the access
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
} from '@mui/material';
import { useState } from 'react';

import { ApiError } from '@/api/client';
import type { Member, ParcelOverview } from '@/api/types';
import { useUpdateMemberParcelsMutation } from '@/api/accountParcels';

export function parcelLabel(item: ParcelOverview): string {
  return `Działka ${item.parcel.parcelNumber}, ${item.parcel.commune}`;
}

export interface ParcelAccessEditorProps {
  accountId: string;
  token: string;
  member: Member;
  parcels: ParcelOverview[];
}

export function ParcelAccessEditor({ accountId, token, member, parcels }: ParcelAccessEditorProps) {
  const saved = member.parcelIds ?? null;
  const [mode, setMode] = useState<'all' | 'selected'>(saved === null ? 'all' : 'selected');
  const [selected, setSelected] = useState<string[]>(saved ?? []);
  const [validation, setValidation] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const update = useUpdateMemberParcelsMutation(accountId, token);

  const toggle = (id: string) => {
    setDone(false);
    setValidation(null);
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const save = () => {
    if (mode === 'selected' && selected.length === 0) {
      setValidation('Zaznacz co najmniej jedną działkę albo wybierz „Wszystkie działki”.');
      return;
    }
    setValidation(null);
    setDone(false);
    update.mutate(
      { memberId: member.id, parcelIds: mode === 'all' ? null : selected },
      { onSuccess: () => setDone(true) },
    );
  };

  const error =
    update.error instanceof ApiError
      ? update.error.message
      : update.error
        ? 'Nie udało się zapisać. Spróbuj ponownie.'
        : null;

  return (
    <Stack spacing={1.5}>
      <FormControl>
        <FormLabel id={`access-${member.id}`} sx={{ color: 'text.primary', fontWeight: 700 }}>
          Do których działek ta osoba ma dostęp
        </FormLabel>
        <RadioGroup
          aria-labelledby={`access-${member.id}`}
          value={mode}
          onChange={(event) => {
            setMode(event.target.value as 'all' | 'selected');
            setDone(false);
            setValidation(null);
          }}
        >
          <FormControlLabel value="all" control={<Radio />} label="Wszystkie działki" />
          <FormControlLabel value="selected" control={<Radio />} label="Wybrane działki" />
        </RadioGroup>
      </FormControl>
      {mode === 'selected' && (
        <Box
          component="fieldset"
          sx={{ border: 1, borderColor: 'text.secondary', borderRadius: 2, m: 0, p: 1.5 }}
        >
          <Box component="legend" sx={{ px: 0.5, fontWeight: 700 }}>
            Zaznacz działki
          </Box>
          <Stack>
            {parcels.map((item) => (
              <FormControlLabel
                key={item.parcel.id}
                sx={{ minHeight: 48 }}
                control={
                  <Checkbox
                    checked={selected.includes(item.parcel.id)}
                    onChange={() => toggle(item.parcel.id)}
                  />
                }
                label={parcelLabel(item)}
              />
            ))}
          </Stack>
        </Box>
      )}
      {validation && (
        <Alert severity="warning" role="alert">
          {validation}
        </Alert>
      )}
      {error && (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      )}
      {done && (
        <Alert severity="success" role="status">
          Dostęp zapisany.
        </Alert>
      )}
      <Box>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={update.isPending}
          onClick={save}
          sx={{ minHeight: 48 }}
        >
          {update.isPending ? 'Zapisuję…' : 'Zapisz dostęp'}
        </Button>
      </Box>
    </Stack>
  );
}
