// UI-C-018 API-020 API-001 Parcel search with history hints for the sidebar [T-087]
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import {
  Autocomplete,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { useId, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAccountParcelsQuery } from '@/api/accountParcels';
import { getParcelById, PARCEL_ID_REGEX } from '@/api/parcels';
import { useSearchHistoryStore } from '@/store/searchHistory';
import { useSessionStore } from '@/store/session';

const HISTORY_GROUP = 'Ostatnio wyszukiwane';
const ACCOUNT_GROUP = 'Twoje działki';
const NOT_FOUND_MESSAGE = 'Nie znaleziono działki';
const FORMAT_MESSAGE = 'Wpisz pełny numer działki, np. 061409_2.0009.612';
const LIST_ERROR_MESSAGE = 'Nie udało się wczytać Twoich działek. Możesz wpisać numer.';

// "612, Bronowice (Puławy)" → title "Działka 612", place "Bronowice · gm. Puławy"
// (history keeps only the label, so both groups are split the same way)
function splitLabel(label: string): { title: string; place: string | null } {
  const match = /^(.+?), (.+?)(?: \((.+)\))?$/.exec(label);
  if (!match) return { title: label, place: null };
  const [, number, region, commune] = match;
  return {
    title: `Działka ${number}`,
    place: commune && commune !== region ? `${region} · gm. ${commune}` : (region ?? null),
  };
}

interface SearchOption {
  id: string;
  label: string;
  group: string;
  // Lowercased text matched by the filter: number, locality (region), commune
  haystack: string;
}

export interface ParcelSearchBoxProps {
  // Called after navigation, so the mobile drawer can close
  onNavigate?: () => void;
}

export function ParcelSearchBox({ onNavigate }: ParcelSearchBoxProps) {
  const navigate = useNavigate();
  const helperId = useId();
  const token = useSessionStore((state) => state.token);
  const accountId = useSessionStore((state) => state.activeAccountId);
  const history = useSearchHistoryStore((state) => state.items);
  const addToHistory = useSearchHistoryStore((state) => state.add);
  const removeFromHistory = useSearchHistoryStore((state) => state.remove);
  const accountParcels = useAccountParcelsQuery(accountId, token);

  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const options = useMemo<SearchOption[]>(() => {
    const historyOptions = history.map((item) => ({
      id: item.id,
      label: item.label,
      group: HISTORY_GROUP,
      haystack: `${item.id} ${item.label}`.toLowerCase(),
    }));
    const accountOptions = (accountParcels.data ?? []).map(({ parcel }) => ({
      id: parcel.id,
      label: `${parcel.parcelNumber}, ${parcel.region} (${parcel.commune})`,
      group: ACCOUNT_GROUP,
      haystack:
        `${parcel.id} ${parcel.parcelNumber} ${parcel.region} ${parcel.commune}`.toLowerCase(),
    }));
    return [...historyOptions, ...accountOptions];
  }, [history, accountParcels.data]);

  function go(id: string, label: string) {
    addToHistory({ id, label });
    setError(null);
    setInputValue('');
    void navigate(`/parcel/${encodeURIComponent(id)}`);
    onNavigate?.();
  }

  async function submitTypedId(raw: string) {
    const id = raw.trim();
    if (!PARCEL_ID_REGEX.test(id)) {
      setError(FORMAT_MESSAGE);
      return;
    }
    setIsChecking(true);
    setError(null);
    try {
      const parcel = await getParcelById(id);
      go(parcel.id, `${parcel.parcelNumber}, ${parcel.region} (${parcel.commune})`);
    } catch {
      setError(NOT_FOUND_MESSAGE);
    } finally {
      setIsChecking(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    // Enter on a highlighted option is handled by onChange; here only typed text
    if (event.key !== 'Enter') return;
    if ((event.target as HTMLElement).getAttribute('aria-activedescendant')) return;
    event.preventDefault();
    void submitTypedId(inputValue);
  }

  return (
    <Box>
      <Autocomplete<SearchOption, false, false, true>
        freeSolo
        openOnFocus
        blurOnSelect
        options={options}
        groupBy={(option) => option.group}
        getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
        getOptionKey={(option) =>
          typeof option === 'string' ? option : `${option.group}-${option.id}`
        }
        filterOptions={(all, state) => {
          const query = state.inputValue.trim().toLowerCase();
          return query ? all.filter((option) => option.haystack.includes(query)) : all;
        }}
        inputValue={inputValue}
        onInputChange={(_event, value, reason) => {
          if (reason === 'reset') return;
          setInputValue(value);
          setError(null);
        }}
        onChange={(_event, value) => {
          if (value && typeof value !== 'string') go(value.id, value.label);
        }}
        disabled={isChecking}
        loading={accountParcels.isLoading}
        loadingText="Wczytuję Twoje działki…"
        noOptionsText="Brak podpowiedzi. Wpisz pełny numer działki i naciśnij Enter."
        renderOption={(props, option) => {
          const { key, ...rest } = props as typeof props & { key: string };
          const isHistory = option.group === HISTORY_GROUP;
          const { title, place } = splitLabel(option.label);
          return (
            <Box
              component="li"
              key={key}
              {...rest}
              sx={{ minHeight: 56, gap: 1, justifyContent: 'space-between' }}
            >
              {/* T-103: two clear lines – "Działka 612" bold, place muted below, no wrapping */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                {isHistory ? (
                  <HistoryIcon aria-hidden sx={{ color: 'text.secondary', flexShrink: 0 }} />
                ) : (
                  <SearchIcon aria-hidden sx={{ color: 'text.secondary', flexShrink: 0 }} />
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    component="span"
                    noWrap
                    sx={{ display: 'block', fontSize: '1.125rem', fontWeight: 700 }}
                  >
                    {title}
                  </Typography>
                  {place && (
                    <Typography
                      component="span"
                      noWrap
                      sx={{ display: 'block', fontSize: '1rem', color: 'text.secondary' }}
                    >
                      {place}
                    </Typography>
                  )}
                </Box>
              </Box>
              {isHistory && (
                <IconButton
                  aria-label={`Usuń z historii: ${option.label}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeFromHistory(option.id);
                  }}
                  sx={{ width: 48, height: 48, flexShrink: 0 }}
                >
                  <CloseIcon aria-hidden />
                </IconButton>
              )}
            </Box>
          );
        }}
        slotProps={{
          listbox: { 'aria-label': 'Podpowiedzi działek', sx: { maxHeight: '60vh' } },
          // T-103: wider than the 248 px field, with a border and shadow so it stands out from the panel
          popper: {
            placement: 'bottom-start',
            sx: { minWidth: 'min(380px, calc(100vw - 32px))' },
          },
          paper: {
            elevation: 8,
            sx: {
              fontSize: '1.125rem',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              mt: 0.5,
              '& .MuiAutocomplete-groupLabel': {
                fontSize: '0.875rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'primary.main',
                bgcolor: 'background.paper',
                lineHeight: 2.5,
              },
              '& .MuiAutocomplete-option': { px: 1.5 },
              '& .MuiAutocomplete-option:not(:last-of-type)': {
                borderBottom: 1,
                borderColor: 'divider',
              },
              '& .MuiAutocomplete-noOptions, & .MuiAutocomplete-loading': { fontSize: '1.125rem' },
            },
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Szukaj działki"
            placeholder="Numer lub miejscowość"
            error={error !== null}
            helperText={
              error ? (
                <Box component="span" sx={{ display: 'inline-flex', gap: 0.75 }}>
                  <ErrorOutlineIcon
                    aria-hidden
                    fontSize="small"
                    sx={{ mt: '2px', flexShrink: 0 }}
                  />
                  <span>{error}</span>
                </Box>
              ) : accountParcels.isError ? (
                LIST_ERROR_MESSAGE
              ) : undefined
            }
            onKeyDown={handleKeyDown}
            slotProps={{
              htmlInput: { ...params.inputProps, 'aria-describedby': helperId },
              formHelperText: { id: helperId, role: error ? 'alert' : undefined },
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isChecking && (
                      <InputAdornment position="end">
                        <CircularProgress size={24} aria-label="Szukam działki" />
                      </InputAdornment>
                    )}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
            sx={{
              '& .MuiInputBase-root': { minHeight: 56, fontSize: '1.125rem' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'text.secondary' },
              '& .Mui-error .MuiOutlinedInput-notchedOutline': {
                borderColor: 'error.main',
                borderWidth: 3,
              },
              '& .MuiInputLabel-root': { fontSize: '1.125rem' },
              '& .MuiFormHelperText-root': { fontSize: '1.125rem', fontWeight: 600, mx: 0 },
            }}
          />
        )}
      />
    </Box>
  );
}
