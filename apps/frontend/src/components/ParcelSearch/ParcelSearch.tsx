// UI-C-001 ParcelSearch: "Jak znaleźć działkę?" card with mode switch (parcel ID with format validation / address / GPS) and loading state
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
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
const NOT_FOUND_MESSAGE = 'Nie znaleziono działki. Sprawdź numer albo kliknij działkę na mapie.';
const FORMAT_HINT = `Format: ${EXAMPLE_ID}`;

export type ParcelSearchMode = 'number' | 'address' | 'gps' | 'map';
type Mode = ParcelSearchMode;

const BASE_MODES: { value: Mode; label: string; icon: ReactNode }[] = [
  { value: 'number', label: 'Numer działki', icon: <ViewWeekOutlinedIcon aria-hidden /> },
  { value: 'address', label: 'Adres', icon: <HomeOutlinedIcon aria-hidden /> },
  { value: 'gps', label: 'GPS', icon: <PlaceOutlinedIcon aria-hidden /> },
];
// T-103: optional 4th way – pick the parcel on a map the page passes in (mapSlot)
const MAP_MODE = { value: 'map' as Mode, label: 'Mapa', icon: <MapOutlinedIcon aria-hidden /> };

interface ParcelSearchProps {
  defaultValue?: string;
  isLoading?: boolean;
  error?: { code: string; message: string } | null;
  /** Error of the GPS / map-click lookup (shown in the GPS tab) */
  pickError?: { code: string; message: string } | null;
  onSearch: (parcelId: string) => void;
  /** GPS position found: the page looks up the parcel under it (same as a map click) */
  onLocate?: (lat: number, lon: number) => void;
  /** Address / town found: the page centers the map there (bounds: fit the whole town) */
  onPlaceFound?: (lat: number, lon: number, bounds?: [[number, number], [number, number]]) => void;
  /** When given, a 4th option „Mapa” shows this map (the map stays hidden in the other options) */
  mapSlot?: ReactNode;
  /** Option selected when the component mounts (e.g. „map” after a parcel was clicked there) */
  defaultMode?: Mode;
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

function FieldError({ children }: { children: ReactNode }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', gap: 0.75, alignItems: 'flex-start' }}>
      <ErrorOutlineIcon aria-hidden fontSize="small" sx={{ mt: '2px', flexShrink: 0 }} />
      <span>{children}</span>
    </Box>
  );
}

const inputSx = {
  '& .MuiInputBase-root': {
    minHeight: { xs: 64, md: 68 },
    fontSize: { xs: '1.25rem', md: '1.375rem' },
  },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'text.secondary' },
  '& .Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: 'error.main', borderWidth: 3 },
  '& .MuiFormHelperText-root': { fontSize: '1.125rem', fontWeight: 600, mx: 0 },
};

export function ParcelSearch({
  defaultValue = '',
  isLoading = false,
  error = null,
  pickError = null,
  onSearch,
  onLocate,
  onPlaceFound,
  mapSlot,
  defaultMode = 'number',
}: ParcelSearchProps) {
  // with a map, „Adres” is dropped: the town search above the map does the same job
  const MODES = mapSlot
    ? [...BASE_MODES.filter((item) => item.value !== 'address'), MAP_MODE]
    : BASE_MODES;
  const [mode, setMode] = useState<Mode>(
    defaultMode === 'map' && !mapSlot ? 'number' : defaultMode,
  );
  const [value, setValue] = useState(defaultValue);
  const [address, setAddress] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeError, setPlaceError] = useState<string | null>(null);
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
      if (place) {
        onPlaceFound?.(place.lat, place.lon);
        // the map is hidden behind „Mapa” on pages that pass mapSlot: open it to show the place
        if (mapSlot) setMode('map');
      } else setAddressError(NOT_FOUND_MESSAGE);
    } catch {
      setAddressError('Nie udało się wyszukać adresu. Sprawdź internet albo kliknij mapę.');
    } finally {
      setIsBusy(false);
    }
  }

  // „Mapa” option: find a town / village and move the map there, then the user clicks the parcel
  async function handlePlace(event: FormEvent) {
    event.preventDefault();
    const query = placeQuery.trim();
    if (query.length < 2) {
      setPlaceError('Wpisz nazwę miejscowości.');
      return;
    }
    setPlaceError(null);
    setIsBusy(true);
    try {
      // towns and villages only, so the map shows the whole place and not a street of that name
      const place = await geocodeAddress(query, { settlement: true });
      if (place) onPlaceFound?.(place.lat, place.lon, place.bounds);
      else setPlaceError('Nie znaleziono takiej miejscowości. Sprawdź pisownię.');
    } catch {
      setPlaceError('Nie udało się wyszukać miejscowości. Sprawdź internet.');
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
          gridTemplateColumns: {
            xs: MODES.length > 3 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
            sm: `repeat(${MODES.length}, minmax(0, 1fr))`,
          },
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
              helperText={
                errorMessage ? (
                  <FieldError>
                    {errorMessage} ({FORMAT_HINT})
                  </FieldError>
                ) : (
                  FORMAT_HINT
                )
              }
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
              helperText={
                addressError ? <FieldError>{addressError}</FieldError> : 'np. Bronowice 12, Puławy'
              }
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
          {(gpsError ?? pickError?.message) && (
            <Typography
              role="alert"
              color="error"
              sx={{
                fontWeight: 600,
                fontSize: '1.125rem',
                border: 3,
                borderColor: 'error.main',
                borderRadius: '12px',
                p: 1.5,
              }}
            >
              <FieldError>{gpsError ?? pickError?.message}</FieldError>
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

      {mode === 'map' && (
        <Stack spacing={1.5}>
          <Stack
            component="form"
            role="search"
            aria-label="Szukaj miejscowości na mapie"
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            noValidate
            onSubmit={(event) => void handlePlace(event)}
            sx={{ alignItems: { sm: 'flex-start' } }}
          >
            <TextField
              label="Miejscowość"
              value={placeQuery}
              onChange={(event) => {
                setPlaceQuery(event.target.value);
                setPlaceError(null);
              }}
              error={placeError !== null}
              helperText={placeError ? <FieldError>{placeError}</FieldError> : undefined}
              slotProps={{ formHelperText: { role: placeError ? 'alert' : undefined } }}
              placeholder="np. Puławy"
              fullWidth
              autoComplete="address-level2"
              disabled={disabled}
              sx={inputSx}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={disabled}
              startIcon={submitIcon}
              sx={{ minHeight: 56, fontSize: '1.125rem', flexShrink: 0, px: 3 }}
            >
              {isBusy ? 'Szukam…' : 'Szukaj'}
            </Button>
          </Stack>
          {/* a failed map click shows here, next to the map it came from */}
          {pickError?.message && (
            <Typography
              role="alert"
              color="error"
              sx={{
                fontWeight: 600,
                fontSize: '1.125rem',
                border: 3,
                borderColor: 'error.main',
                borderRadius: '12px',
                p: 1.5,
              }}
            >
              <FieldError>{pickError.message}</FieldError>
            </Typography>
          )}
          {mapSlot}
        </Stack>
      )}
    </Stack>
  );
}
