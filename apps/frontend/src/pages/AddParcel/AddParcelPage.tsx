// UI-S-013 T-095 Add a parcel to my parcels: search (API-001/002), map preview, "Dodaj do moich działek" (API-022)
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useAccountParcelsQuery, useAddAccountParcelMutation } from '@/api/accountParcels';
import { ApiError } from '@/api/client';
import { useParcelByPointMutation, useParcelQuery } from '@/api/parcels';
import type { Parcel } from '@/api/types';
import { ParcelMap } from '@/components/ParcelMap/ParcelMap';
import { ParcelSearch } from '@/components/ParcelSearch/ParcelSearch';
import { useSessionStore } from '@/store/session';
import { errorMessage } from '@/utils/errorMessages';

function toError(error: unknown): { code: string; message: string; canRetry: boolean } | null {
  if (!error) return null;
  const { message, canRetry } = errorMessage(error);
  return { code: error instanceof ApiError ? error.code : 'UNKNOWN', message, canRetry };
}

function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return 'Nie możesz dodawać działek na tym koncie. Masz ograniczony dostęp do gospodarstwa.';
  }
  return errorMessage(error).message;
}

export function AddParcelPage() {
  const accountId = useSessionStore((state) => state.activeAccountId);
  const token = useSessionStore((state) => state.token);
  const [searchId, setSearchId] = useState<string | null>(null);
  const searchQuery = useParcelQuery(searchId);
  const pickMutation = useParcelByPointMutation();
  const accountParcels = useAccountParcelsQuery(accountId, token);
  const addMutation = useAddAccountParcelMutation(accountId ?? '', token ?? '');
  const resultRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<{ lat: number; lon: number } | null>(null);
  const [picked, setPicked] = useState<Parcel | null>(null);
  const [added, setAdded] = useState(false);

  const parcel = picked ?? searchQuery.data ?? null;
  const isSearching = searchId !== null && searchQuery.isFetching;
  const isLoading = isSearching || pickMutation.isPending;
  const byId = searchId !== null && !picked;
  const error = toError(byId ? searchQuery.error : pickMutation.error);
  const alreadyOnAccount =
    parcel !== null && (accountParcels.data ?? []).some((item) => item.parcel.id === parcel.id);
  const saveError = addMutation.isError ? saveErrorMessage(addMutation.error) : null;
  const showResult = added || alreadyOnAccount;

  function reset() {
    addMutation.reset();
    setAdded(false);
  }

  function handleSearch(parcelId: string) {
    reset();
    setPicked(null);
    pickMutation.reset();
    if (parcelId === searchId) void searchQuery.refetch();
    else setSearchId(parcelId);
  }

  function handlePick(lat: number, lon: number) {
    reset();
    pickMutation.mutate({ lat, lon }, { onSuccess: setPicked });
  }

  function handleAdd() {
    if (!parcel || !accountId || !token) return;
    addMutation.mutate(parcel.id, { onSuccess: () => setAdded(true) });
  }

  // move focus to the outcome message so keyboard and screen reader users get it
  useEffect(() => {
    if (added || saveError || alreadyOnAccount) resultRef.current?.focus();
  }, [added, saveError, alreadyOnAccount, parcel?.id]);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 560px) minmax(0, 1fr)' },
        gap: { xs: 3, md: 4 },
        alignItems: 'start',
      }}
    >
      <Stack spacing={3} component="section" aria-label="Wyszukiwanie działki">
        <Stack spacing={1.25}>
          <Typography variant="h1" component="h1">
            Dodaj działkę
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: '1.125rem', md: '1.25rem' } }}>
            Znajdź działkę po numerze, adresie lub GPS albo kliknij ją na mapie. Zapiszemy ją w
            Twoich działkach.
          </Typography>
        </Stack>
        <ParcelSearch
          key={parcel?.id ?? 'empty'}
          defaultValue={parcel?.id}
          isLoading={isLoading}
          error={byId ? error : null}
          pickError={byId ? null : error}
          onSearch={handleSearch}
          onLocate={handlePick}
          onPlaceFound={(lat, lon) => setFocus({ lat, lon })}
        />
        {error?.canRetry && !isLoading && byId && searchId !== null && (
          <Button
            variant="outlined"
            onClick={() => handleSearch(searchId)}
            sx={{ alignSelf: 'flex-start', minHeight: 48 }}
          >
            Ponów
          </Button>
        )}
        {isLoading && (
          <Stack direction="row" spacing={1.5} role="status" alignItems="center">
            <CircularProgress size={24} aria-hidden />
            <Typography sx={{ fontSize: '1.125rem' }}>Szukamy działki…</Typography>
          </Stack>
        )}
        {!parcel && !isLoading && !error && (
          <Typography color="text.secondary" sx={{ fontSize: '1.125rem' }}>
            Nie wybrano jeszcze działki. Wyszukaj ją, żeby zobaczyć podgląd.
          </Typography>
        )}
        {parcel && !isLoading && (
          <Box
            component="section"
            aria-label="Wybrana działka"
            sx={{
              border: 1,
              borderColor: 'kropla.line',
              borderRadius: '16px',
              p: { xs: 2, md: 3 },
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="h2" component="h2" sx={{ fontSize: '1.375rem', mb: 1.5 }}>
              Działka {parcel.parcelNumber}
            </Typography>
            <Box component="dl" sx={{ m: 0, display: 'grid', gap: 1 }}>
              {[
                ['Numer działki', parcel.parcelNumber],
                ['Miejscowość', parcel.region],
                ['Gmina', parcel.commune],
                ['Powierzchnia', `${parcel.areaHa.toLocaleString('pl-PL')} ha`],
              ].map(([label, value]) => (
                <Box
                  key={label}
                  sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 1.5, fontSize: '1.125rem' }}
                >
                  <Box component="dt" sx={{ color: 'text.secondary', minWidth: 140 }}>
                    {label}
                  </Box>
                  <Box component="dd" sx={{ m: 0, fontWeight: 600 }}>
                    {value}
                  </Box>
                </Box>
              ))}
            </Box>
            <Box ref={resultRef} tabIndex={-1} sx={{ mt: 2.5, outline: 'none' }}>
              {saveError && (
                <Stack
                  direction="row"
                  spacing={1}
                  role="alert"
                  alignItems="flex-start"
                  sx={{ color: 'error.main', mb: 2 }}
                >
                  <ErrorOutlineIcon aria-hidden />
                  <Typography sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    {saveError}
                  </Typography>
                </Stack>
              )}
              {showResult && (
                <Stack role="status" spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <CheckCircleOutlineIcon aria-hidden color="success" />
                    <Typography sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
                      {added
                        ? 'Dodano do Twoich działek'
                        : 'Ta działka jest już w Twoich działkach'}
                    </Typography>
                  </Stack>
                  <Button
                    component={RouterLink}
                    to="/dzialki"
                    variant="outlined"
                    sx={{ minHeight: 48, alignSelf: 'flex-start' }}
                  >
                    Przejdź do Moich działek
                  </Button>
                </Stack>
              )}
            </Box>
            {!showResult && (
              <Button
                variant="contained"
                size="large"
                onClick={handleAdd}
                disabled={addMutation.isPending || !accountId || !token}
                startIcon={addMutation.isPending ? <CircularProgress size={20} /> : undefined}
                sx={{ minHeight: 48, fontSize: '1.125rem', width: { xs: '100%', sm: 'auto' } }}
              >
                {addMutation.isPending ? 'Dodawanie…' : 'Dodaj do moich działek'}
              </Button>
            )}
          </Box>
        )}
      </Stack>
      <Box
        component="section"
        aria-label="Podgląd na mapie"
        sx={{
          minWidth: 0,
          border: 1,
          borderColor: 'kropla.line',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <ParcelMap
          parcel={parcel}
          focus={focus}
          focusKey={parcel ? 1 : 0}
          height={{ xs: 320, md: 520 }}
          isLoading={isLoading}
          errorMessage={null}
          onPick={handlePick}
        />
      </Box>
    </Box>
  );
}
