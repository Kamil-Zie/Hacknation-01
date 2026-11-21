// UI-S-001 Start i wybór działki: search by TERYT ID or map click, summary card, next step button
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { useParcelByPointMutation, useParcelQuery } from '@/api/parcels';
import { ParcelMap } from '@/components/ParcelMap/ParcelMap';
import { ParcelSearch } from '@/components/ParcelSearch/ParcelSearch';
import { ParcelSummaryCard } from '@/components/ParcelSummaryCard/ParcelSummaryCard';
import { useSelectionStore } from '@/store/selection';

const STEPS = ['Wskaż działkę', 'Wybierz uprawę i datę', 'Zobacz raport o wodzie'];

// T-024: user-facing texts for API-001/API-002 error codes from contracts/api.json
const ERROR_MESSAGES: Record<string, string> = {
  PARCEL_NOT_FOUND: 'Nie znaleziono działki. Sprawdź numer albo kliknij działkę na mapie.',
  UPSTREAM_UNAVAILABLE: 'Serwis działek GUGiK chwilowo nie odpowiada. Spróbuj ponownie za chwilę.',
  TIMEOUT: 'Serwis działek odpowiada zbyt długo. Spróbuj ponownie.',
  NETWORK_ERROR: 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.',
};

function toError(error: unknown): { code: string; message: string } | null {
  if (!error) return null;
  if (error instanceof ApiError) {
    const hint = typeof error.details?.hint === 'string' ? ` ${error.details.hint}` : '';
    const message = ERROR_MESSAGES[error.code] ?? `${error.message}.${hint}`;
    return { code: error.code, message };
  }
  return {
    code: 'UPSTREAM_UNAVAILABLE',
    message: 'Nie udało się pobrać działki. Spróbuj ponownie.',
  };
}

export function StartPage() {
  const navigate = useNavigate();
  const parcel = useSelectionStore((state) => state.parcel);
  const setParcel = useSelectionStore((state) => state.setParcel);
  const [searchId, setSearchId] = useState<string | null>(null);
  const searchQuery = useParcelQuery(searchId);
  const pickMutation = useParcelByPointMutation();

  useEffect(() => {
    if (searchQuery.data) setParcel(searchQuery.data);
  }, [searchQuery.data, setParcel]);

  function handleSearch(parcelId: string) {
    pickMutation.reset();
    if (parcelId === searchId) {
      void searchQuery.refetch();
    } else {
      setSearchId(parcelId);
    }
  }

  function handlePick(lat: number, lon: number) {
    setSearchId(null);
    pickMutation.mutate({ lat, lon }, { onSuccess: setParcel });
  }

  const isSearching = searchId !== null && searchQuery.isFetching;
  const isLoading = isSearching || pickMutation.isPending;
  const error = toError(searchId !== null ? searchQuery.error : pickMutation.error);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        minHeight: { lg: '100vh' },
        overflowX: 'hidden',
      }}
    >
      <Container
        maxWidth={false}
        sx={{ py: { xs: 3, md: 4 }, width: { lg: 480 }, maxWidth: { lg: 480 }, flexShrink: 0 }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }} gutterBottom>
              Sprawdź wodę na swojej działce
            </Typography>
            <Box component="ol" sx={{ m: 0, pl: 3, color: 'text.secondary' }}>
              {STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </Box>
          </Box>
          {/* key: remount with the picked parcel ID after a map click */}
          <ParcelSearch
            key={parcel?.id ?? 'empty'}
            defaultValue={parcel?.id}
            isLoading={isLoading}
            error={searchId !== null ? error : null}
            onSearch={handleSearch}
          />
          {parcel && <ParcelSummaryCard parcel={parcel} />}
          <Button
            variant="contained"
            size="large"
            disabled={!parcel}
            onClick={() => parcel && navigate(`/parcel/${encodeURIComponent(parcel.id)}`)}
            sx={{ minHeight: 48 }}
          >
            Dalej: uprawa
          </Button>
        </Stack>
      </Container>
      <Box sx={{ flex: 1, p: 2, pt: { xs: 0, lg: 2 }, minWidth: 0, display: 'flex' }}>
        <ParcelMap
          parcel={parcel}
          isLoading={isLoading}
          errorMessage={searchId === null ? (error?.message ?? null) : null}
          onPick={handlePick}
        />
      </Box>
    </Box>
  );
}
