// UI-S-013 T-103 TownSearch: town / village type-ahead above the add-parcel map ("sul" → "Sulnowo, powiat świecki")
import SearchIcon from '@mui/icons-material/Search';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

import type { PlaceSuggestion } from '@/api/geocode';
import { suggestPlaces } from '@/api/geocode';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

export interface TownSearchProps {
  disabled?: boolean;
  /** error from the Enter / „Szukaj” fallback search (shown under the field) */
  error?: string | null;
  isBusy?: boolean;
  /** a suggestion was chosen: move the map there */
  onPick: (place: PlaceSuggestion) => void;
  /** free text + Enter / „Szukaj” without choosing a suggestion */
  onSubmitText: (text: string) => void;
}

export function TownSearch({
  disabled = false,
  error = null,
  isBusy = false,
  onPick,
  onSubmitText,
}: TownSearchProps) {
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // debounced type-ahead; an older request is aborted when the user keeps typing
  useEffect(() => {
    const query = input.trim();
    if (query.length < MIN_CHARS) {
      setOptions([]);
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    const timer = setTimeout(() => {
      suggestPlaces(query, controller.signal)
        .then((found) => {
          setOptions(found);
          setFetchError(false);
        })
        .catch((reason: unknown) => {
          if ((reason as Error).name !== 'AbortError') setFetchError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [input]);

  const message =
    error ?? (fetchError ? 'Podpowiedzi nie działają. Wpisz nazwę i naciśnij Enter.' : null);

  return (
    <Stack
      component="form"
      role="search"
      aria-label="Szukaj miejscowości na mapie"
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmitText(input);
      }}
      sx={{ alignItems: { sm: 'flex-start' } }}
    >
      <Autocomplete<PlaceSuggestion, false, false, true>
        freeSolo
        fullWidth
        disabled={disabled}
        options={options}
        filterOptions={(all) => all}
        getOptionLabel={(option) =>
          typeof option === 'string' ? option : `${option.name}, ${option.detail}`
        }
        getOptionKey={(option) => (typeof option === 'string' ? option : option.id)}
        inputValue={input}
        onInputChange={(_event, value) => setInput(value)}
        onChange={(_event, value) => {
          if (value && typeof value !== 'string') onPick(value);
        }}
        loading={isLoading}
        loadingText="Szukam miejscowości…"
        noOptionsText={
          input.trim().length < MIN_CHARS ? 'Wpisz początek nazwy' : 'Brak takiej miejscowości'
        }
        renderOption={(props, option) => {
          const { key, ...rest } = props as typeof props & { key: string };
          return (
            <Box component="li" key={key} {...rest} sx={{ minHeight: 48 }}>
              <Stack sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '1.125rem', fontWeight: 700 }}>
                  {option.name}
                </Typography>
                <Typography sx={{ fontSize: '1rem', color: 'text.secondary' }}>
                  {option.detail}
                </Typography>
              </Stack>
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Miejscowość"
            placeholder="np. Sulnowo"
            error={message !== null}
            helperText={message ?? undefined}
            slotProps={{
              htmlInput: params.inputProps,
              formHelperText: { role: message ? 'alert' : undefined },
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isLoading && <CircularProgress size={20} aria-hidden />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
            sx={{
              '& .MuiInputBase-root': { minHeight: 56, fontSize: '1.125rem' },
              '& .MuiInputLabel-root': { fontSize: '1.125rem' },
              '& .MuiFormHelperText-root': { fontSize: '1.125rem', fontWeight: 600, mx: 0 },
            }}
          />
        )}
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={disabled}
        startIcon={
          isBusy ? <CircularProgress size={24} color="inherit" /> : <SearchIcon aria-hidden />
        }
        sx={{ minHeight: 56, fontSize: '1.125rem', flexShrink: 0, px: 3 }}
      >
        {isBusy ? 'Szukam…' : 'Szukaj'}
      </Button>
    </Stack>
  );
}
