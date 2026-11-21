// UI-C-001 ParcelSearch: "Jak znaleźć działkę?" card with mode switch (parcel ID with format validation / address / GPS) and loading state
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ViewWeekOutlinedIcon from '@mui/icons-material/ViewWeekOutlined';
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useId, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';

import { geocodeAddress } from '@/api/geocode';
import { PARCEL_ID_REGEX } from '@/api/parcels';

const EXAMPLE_ID = '061409_2.0009.612';
const FORMAT_HINT = `Format: ${EXAMPLE_ID}`;

type Mode = 'number' | 'address' | 'gps';

const MODES: { value: Mode; label: string; icon: ReactNode }[] = [
  { value: 'number', label: 'Numer działki', icon: <ViewWeekOutlinedIcon aria-hidden /> },
  { value: 'address', label: 'Adres', icon: <HomeOutlinedIcon aria-hidden /> },
  { value: 'gps', label: 'GPS', icon: <PlaceOutlinedIcon aria-hidden /> },
];

interface ParcelSearchProps {
  defaultValue?: string;
  isLoading?: boolean;
  error?: { code: string; message: string } | null;
  onSearch: (parcelId: string) => void;
  /** GPS position found: the page looks up the parcel under it (same as a map click) */
  onLocate?: (lat: number, lon: number) => void;
  /** Address found: the page centers the map there */
  onPlaceFound?: (lat: number, lon: number) => void;
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-start',
        bgcolor: 'kropla.tint',
        borderRadius: '12px',
        p: 2,
      }}
    >
      <InfoOutlinedIcon aria-hidden sx={{ color: 'kropla.iconMuted', mt: 0.25 }} />
      <Typography sx={{ fontSize: '1.0625rem' }}>{children}</Typography>
    </Box>
  );
}

const inputSx = {
  '& .MuiInputBase-root': {
    minHeight: { xs: 64, md: 68 },
    fontSize: { xs: '1.25rem', md: '1.375rem' },
  },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'text.secondary' },
};

export function ParcelSearch({
  defaultValue = '',
  isLoading = false,
  error = null,
  onSearch,
  onLocate,
  onPlaceFound,
}: ParcelSearchProps) {
  const [mode, setMode] = useState<Mode>('number');
  const [value, setValue] = useState(defaultValue);
  const [address, setAddress] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const helperId = useId();
  const groupRef = useRef<HTMLDivElement>(null);

  const errorMessage = validationError ?? error?.message ?? null;
  const disabled = isLoading || isBusy;

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

  async function handleAddress(event: FormEvent) {
    event.preventDefault();
    const query = address.trim();
    if (query.length < 3) {
      setAddressError('Wpisz miejscowość i numer domu.');
      return;
    }
    setAddressError(null);
    setIsBusy(true);
    try {
      const place = await geocodeAddress(query);
      if (place) onPlaceFound?.(place.lat, place.lon);
      else setAddressError('Nie znaleziono takiego miejsca. Sprawdź pisownię albo kliknij mapę.');
    } catch {
      setAddressError('Nie udało się wyszukać adresu. Sprawdź internet albo kliknij mapę.');
    } finally {
      setIsBusy(false);
    }
  }

  function handleGps() {
    setGpsError(null);
    if (!('geolocation' in navigator)) {
      setGpsError('Ta przeglądarka nie obsługuje lokalizacji. Wpisz numer albo kliknij mapę.');
      return;
    }
    setIsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsBusy(false);
        onLocate?.(position.coords.latitude, position.coords.longitude);
      },
      (positionError) => {
        setIsBusy(false);
        setGpsError(
          positionError.code === positionError.PERMISSION_DENIED
            ? 'Brak zgody na lokalizację. Zezwól w przeglądarce albo wpisz numer lub kliknij mapę.'
            : 'Nie udało się ustalić Twojego położenia. Wpisz numer albo kliknij mapę.',
        );
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  // Radiogroup keyboard: arrows move the selection and focus (roving tabindex)
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const index = MODES.findIndex((item) => item.value === mode);
    const next = MODES[(index + step + MODES.length) % MODES.length];
    if (!next) return;
    setMode(next.value);
    groupRef.current?.querySelector<HTMLElement>(`[data-mode="${next.value}"]`)?.focus();
  }

  const submitIcon =
    isBusy || isLoading ? (
      <CircularProgress size={24} color="inherit" />
    ) : (
      <SearchIcon aria-hidden />
    );
  const ctaSx = { minHeight: 72, fontSize: { xs: '1.25rem', md: '1.375rem' }, width: '100%' };

  return (
    <Stack
      spacing={2}
      sx={{
        border: 1,
        borderColor: 'kropla.line',
        borderRadius: '16px',
        p: { xs: 2, md: 3 },
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="h2" component="h2" sx={{ fontSize: '1.375rem' }}>
        Jak znaleźć działkę?
      </Typography>
      <Box
        ref={groupRef}
        role="radiogroup"
        aria-label="Sposób szukania"
        onKeyDown={handleKeyDown}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 1,
          p: 1,
          bgcolor: 'kropla.tint',
          borderRadius: '16px',
        }}
      >
        {MODES.map((item) => {
          const isChecked = item.value === mode;
          return (
            <ButtonBase
              key={item.value}
              role="radio"
              aria-checked={isChecked}
              tabIndex={isChecked ? 0 : -1}
              data-mode={item.value}
              onClick={() => setMode(item.value)}
              sx={{
                minHeight: { xs: 80, md: 96 },
                px: 0.5,
                py: 1,
                borderRadius: '12px',
                border: 3,
                borderColor: isChecked ? 'kropla.iconMuted' : 'transparent',
                bgcolor: isChecked ? 'background.paper' : 'transparent',
                boxShadow: isChecked ? 1 : 0,
                flexDirection: 'column',
                gap: 1,
                textAlign: 'center',
                fontWeight: 800,
                fontSize: { xs: '1rem', md: '1.1875rem' },
                lineHeight: 1.2,
                '& svg': { fontSize: { xs: 28, md: 32 }, color: 'kropla.iconMuted' },
                '&:focus-visible': {
                  outline: 3,
                  outlineStyle: 'solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                },
              }}
            >
              {item.icon}
              {item.label}
            </ButtonBase>
          );
        })}
      </Box>

      {mode === 'number' && (
        <form onSubmit={handleSubmit} noValidate>
          <Stack spacing={1.5}>
            <TextField
              label="Numer działki"
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
              placeholder={`np. ${EXAMPLE_ID}`}
              fullWidth
              autoComplete="off"
              disabled={isLoading}
              sx={inputSx}
            />
            <InfoBox>
              Numer znajdziesz na <b>wypisie z rejestru gruntów</b> albo we <b>wniosku o dopłaty</b>
              .
            </InfoBox>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isLoading}
              startIcon={submitIcon}
              sx={ctaSx}
            >
              {isLoading ? 'Szukam…' : 'Znajdź działkę'}
            </Button>
          </Stack>
        </form>
      )}

      {mode === 'address' && (
        <form onSubmit={(event) => void handleAddress(event)} noValidate>
          <Stack spacing={1.5}>
            <TextField
              label="Adres lub miejscowość"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setAddressError(null);
              }}
              error={addressError !== null}
              helperText={addressError ?? 'np. Bronowice 12, Puławy'}
              slotProps={{ formHelperText: { role: addressError ? 'alert' : undefined } }}
              placeholder="np. Bronowice 12, Puławy"
              fullWidth
              autoComplete="street-address"
              disabled={disabled}
              sx={inputSx}
            />
            <InfoBox>
              Wpisz miejscowość i numer domu. Pokażemy to miejsce na mapie – potem{' '}
              <b>kliknij swoją działkę</b>.
            </InfoBox>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={disabled}
              startIcon={submitIcon}
              sx={ctaSx}
            >
              {isBusy ? 'Szukam…' : 'Pokaż na mapie'}
            </Button>
          </Stack>
        </form>
      )}

      {mode === 'gps' && (
        <Stack spacing={1.5}>
          <Typography sx={{ fontSize: '1.3125rem', fontWeight: 700 }}>
            Stoisz na swojej działce?
          </Typography>
          <Typography color="text.secondary">
            Telefon lub komputer sprawdzi, gdzie jesteś, i od razu zaznaczy działkę pod Twoimi
            stopami.
          </Typography>
          <InfoBox>
            Przeglądarka zapyta o <b>zgodę na lokalizację</b> – kliknij „Zezwól”.
          </InfoBox>
          {(gpsError ?? error?.message) && (
            <Typography role="alert" color="error" sx={{ fontWeight: 600 }}>
              {gpsError ?? error?.message}
            </Typography>
          )}
          <Button
            variant="contained"
            size="large"
            disabled={disabled}
            onClick={handleGps}
            startIcon={
              isBusy || isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <PlaceOutlinedIcon aria-hidden />
              )
            }
            sx={ctaSx}
          >
            {isBusy ? 'Ustalam położenie…' : 'Znajdź działkę, na której stoję'}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
