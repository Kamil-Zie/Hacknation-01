// UI-C-018 API-001 Parcel search with recent-search hints for the sidebar [T-087, T-103]
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
import { alpha } from '@mui/material/styles';
import { useId, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { getParcelById, PARCEL_ID_REGEX } from '@/api/parcels';
import { useSearchHistoryStore } from '@/store/searchHistory';

const HISTORY_GROUP = 'Ostatnio wyszukiwane';
const NOT_FOUND_MESSAGE = 'Nie znaleziono działki';
const FORMAT_MESSAGE = 'Wpisz pełny numer działki, np. 061409_2.0009.612';

// "612, Bronowice (Puławy)" → title "Działka 612", place "Bronowice · gm. Puławy"
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
  const history = useSearchHistoryStore((state) => state.items);
  const addToHistory = useSearchHistoryStore((state) => state.add);
  const removeFromHistory = useSearchHistoryStore((state) => state.remove);

  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // T-103: only the recent searches are suggested (no „Twoje działki” group)
  const options = useMemo<SearchOption[]>(
    () =>
      history.map((item) => ({
        id: item.id,
        label: item.label,
        group: HISTORY_GROUP,
        haystack: `${item.id} ${item.label}`.toLowerCase(),
      })),
    [history],
  );

  // freeSolo with no matching hint opened an empty list (only its border, a stray line under the
  // field): open the list only when there is something to show
  const [isOpen, setIsOpen] = useState(false);
  const query = inputValue.trim().toLowerCase();
  const hasMatches = options.some((option) => !query || option.haystack.includes(query));

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
        open={isOpen && hasMatches}
        onOpen={() => setIsOpen(true)}
        onClose={() => setIsOpen(false)}
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
        noOptionsText="Brak ostatnich wyszukiwań. Wpisz pełny numer działki i naciśnij Enter."
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
                  <HistoryIcon aria-hidden sx={{ color: 'primary.main', flexShrink: 0 }} />
                ) : (
                  <SearchIcon aria-hidden sx={{ color: 'primary.main', flexShrink: 0 }} />
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
          // T-103 colours: a blue-tinted list (stands out from the side panel in light and dark
          // mode), group headers on a stronger tint, the pointed / keyboard item clearly blue
          paper: {
            elevation: 8,
            sx: (theme) => {
              const tint = (amount: number) =>
                `linear-gradient(${alpha(theme.palette.primary.main, amount)}, ${alpha(theme.palette.primary.main, amount)})`;
              return {
                fontSize: '1.125rem',
                border: 1,
                borderColor: alpha(theme.palette.primary.main, 0.5),
                borderRadius: 2,
                mt: 0.5,
                backgroundColor: theme.palette.background.paper,
                backgroundImage: tint(0.06),
                '& .MuiAutocomplete-groupLabel': {
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: theme.palette.primary.main,
                  backgroundColor: theme.palette.background.paper,
                  backgroundImage: tint(0.16),
                  lineHeight: 2.5,
                },
                '& .MuiAutocomplete-option': {
                  px: 1.5,
                  borderLeft: '4px solid transparent',
                  transition: 'background-color 100ms, border-color 100ms',
                },
                '& .MuiAutocomplete-option:not(:last-of-type)': {
                  borderBottom: `1px solid ${theme.palette.divider}`,
                },
                '& .MuiAutocomplete-option.Mui-focused, & .MuiAutocomplete-option:hover': {
                  backgroundColor: `${alpha(theme.palette.primary.main, 0.22)} !important`,
                  borderLeftColor: theme.palette.primary.main,
                },
                '& .MuiAutocomplete-option[aria-selected="true"]': {
                  backgroundColor: `${alpha(theme.palette.primary.main, 0.3)} !important`,
                },
                '& .MuiAutocomplete-noOptions, & .MuiAutocomplete-loading': {
                  fontSize: '1.125rem',
                },
              };
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
