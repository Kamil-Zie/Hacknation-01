// UI-S-013 API-016 API-022 T-103 FieldFromMap: parcels clicked on the add-parcel map → one new field (also saved to Moje działki)
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, Button, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { addAccountParcel } from '@/api/accountParcels';
import { createField } from '@/api/fields';
import type { Parcel } from '@/api/types';
import { errorMessage } from '@/utils/errorMessages';

export const FIELD_MIN_PARCELS = 2;
export const FIELD_MAX_PARCELS = 20;

export interface FieldFromMapProps {
  accountId: string | null;
  token: string | null;
  parcels: Parcel[];
  isPicking: boolean;
  pickError: string | null;
  onRemove: (parcelId: string) => void;
  onCreated: () => void;
}

export function FieldFromMap({
  accountId,
  token,
  parcels,
  isPicking,
  pickError,
  onRemove,
  onCreated,
}: FieldFromMapProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const totalHa = parcels.reduce((sum, item) => sum + item.areaHa, 0);
  const canCreate =
    !!accountId &&
    !!token &&
    name.trim().length > 0 &&
    parcels.length >= FIELD_MIN_PARCELS &&
    parcels.length <= FIELD_MAX_PARCELS &&
    !isSaving;

  async function handleCreate() {
    if (!canCreate || !accountId || !token) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      // the parcels land in Moje działki too (API-022 answers 200 when one is already there)
      for (const item of parcels) await addAccountParcel(accountId, item.id, token);
      const field = await createField(
        accountId,
        { name: name.trim(), parcelIds: parcels.map((item) => item.id) },
        token,
      );
      void queryClient.invalidateQueries({ queryKey: ['accounts', accountId, 'parcels'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts', accountId, 'fields'] });
      setCreated(field.name);
      setName('');
      onCreated();
    } catch (error) {
      setSaveError(errorMessage(error).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Stack spacing={1.5} component="section" aria-label="Nowe pole z działek na mapie">
      <Typography sx={{ fontSize: '1.125rem' }}>
        Klikaj działki na mapie, żeby dodać je do pola. Ponowne kliknięcie usuwa działkę.
      </Typography>

      {parcels.length > 0 && (
        <Box
          component="ul"
          aria-label="Działki w nowym polu"
          sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 1 }}
        >
          {parcels.map((item) => (
            <li key={item.id}>
              <Chip
                label={`Działka ${item.parcelNumber} · ${item.region}`}
                onDelete={() => onRemove(item.id)}
                deleteIcon={<CloseIcon aria-label={`Usuń działkę ${item.parcelNumber} z pola`} />}
                sx={{ fontSize: '1rem', height: 40 }}
              />
            </li>
          ))}
        </Box>
      )}

      <Typography sx={{ fontSize: '1.125rem', fontWeight: 600 }} role="status">
        {isPicking
          ? 'Szukam działki…'
          : `Wybrane: ${parcels.length} (${totalHa.toLocaleString('pl-PL', {
              maximumFractionDigits: 2,
            })} ha)${parcels.length < FIELD_MIN_PARCELS ? ` – wybierz co najmniej ${FIELD_MIN_PARCELS}` : ''}`}
      </Typography>

      {pickError && (
        <Stack direction="row" spacing={1} role="alert" sx={{ color: 'error.main' }}>
          <ErrorOutlineIcon aria-hidden />
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 600 }}>{pickError}</Typography>
        </Stack>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { sm: 'flex-start' } }}
      >
        <TextField
          label="Nazwa pola"
          placeholder="np. Pszenica za stodołą"
          value={name}
          onChange={(event) => setName(event.target.value)}
          fullWidth
          disabled={isSaving}
          slotProps={{ htmlInput: { maxLength: 120 } }}
          sx={{
            '& .MuiInputBase-root': { minHeight: 56, fontSize: '1.125rem' },
            '& .MuiInputLabel-root': { fontSize: '1.125rem' },
          }}
        />
        <Button
          variant="contained"
          size="large"
          disabled={!canCreate}
          onClick={() => void handleCreate()}
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : undefined}
          sx={{ minHeight: 56, fontSize: '1.125rem', flexShrink: 0, px: 3, whiteSpace: 'nowrap' }}
        >
          {isSaving ? 'Tworzę pole…' : `Utwórz pole (${parcels.length})`}
        </Button>
      </Stack>

      {saveError && (
        <Stack direction="row" spacing={1} role="alert" sx={{ color: 'error.main' }}>
          <ErrorOutlineIcon aria-hidden />
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 600 }}>{saveError}</Typography>
        </Stack>
      )}
      {created && (
        <Stack
          direction="row"
          spacing={1}
          role="status"
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          <CheckCircleOutlineIcon aria-hidden color="success" />
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
            Utworzono pole „{created}”. Działki są też w Twoich działkach.
          </Typography>
          <Button component={RouterLink} to="/pola" variant="outlined" sx={{ minHeight: 48 }}>
            Przejdź do Moich pól
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
