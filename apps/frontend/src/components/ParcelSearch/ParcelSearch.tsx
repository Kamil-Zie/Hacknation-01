// UI-C-001 ParcelSearch: TERYT parcel ID field with format validation and loading state
import { Button, CircularProgress, Stack, TextField } from '@mui/material';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';

import { PARCEL_ID_REGEX } from '@/api/parcels';

const EXAMPLE_ID = '061409_2.0009.612';
const FORMAT_HINT = `Format: ${EXAMPLE_ID}`;

interface ParcelSearchProps {
  defaultValue?: string;
  isLoading?: boolean;
  error?: { code: string; message: string } | null;
  onSearch: (parcelId: string) => void;
}

export function ParcelSearch({
  defaultValue = '',
  isLoading = false,
  error = null,
  onSearch,
}: ParcelSearchProps) {
  const [value, setValue] = useState(defaultValue);
  const [validationError, setValidationError] = useState<string | null>(null);
  const helperId = useId();

  const errorMessage = validationError ?? error?.message ?? null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!PARCEL_ID_REGEX.test(trimmed)) {
      setValidationError('Niepoprawny numer działki.');
      return;
    }
    setValidationError(null);
    onSearch(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-start' }}>
        <TextField
          label="Numer działki (TERYT)"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setValidationError(null);
          }}
          error={errorMessage !== null}
          helperText={errorMessage ? `${errorMessage} (${FORMAT_HINT})` : FORMAT_HINT}
          slotProps={{
            htmlInput: { 'aria-describedby': helperId },
            formHelperText: { id: helperId, role: errorMessage ? 'alert' : undefined },
          }}
          placeholder={EXAMPLE_ID}
          fullWidth
          autoComplete="off"
          disabled={isLoading}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
          sx={{ minHeight: 56, minWidth: 140, width: { xs: '100%', md: 'auto' } }}
        >
          {isLoading ? 'Szukam…' : 'Szukaj'}
        </Button>
      </Stack>
    </form>
  );
}
