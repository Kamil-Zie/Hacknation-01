// UI-S-001 Start i wybór działki: search by TERYT ID or map click, summary card, next step button
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { useParcelByPointMutation, useParcelQuery } from '@/api/parcels';
import { ExampleParcelButton } from '@/components/ExampleParcelButton/ExampleParcelButton';
import { ParcelMap } from '@/components/ParcelMap/ParcelMap';
import { ParcelSearch } from '@/components/ParcelSearch/ParcelSearch';
import { ParcelSummaryCard } from '@/components/ParcelSummaryCard/ParcelSummaryCard';
import { RecentParcels } from '@/components/RecentParcels/RecentParcels';
import { useRecentParcelsStore } from '@/store/recentParcels';
import { useSelectionStore } from '@/store/selection';
import { errorMessage } from '@/utils/errorMessages';

const STEPS = ['Wskaż działkę', 'Wybierz uprawę i datę', 'Zobacz raport o wodzie'];

function toError(error: unknown): { code: string; message: string; canRetry: boolean } | null {
  if (!error) return null;
  const { message, canRetry } = errorMessage(error);
  return { code: error instanceof ApiError ? error.code : 'UNKNOWN', message, canRetry };
}

export function StartPage() {
  const navigate = useNavigate();
  const parcel = useSelectionStore((state) => state.parcel);
  const setParcel = useSelectionStore((state) => state.setParcel);
  const setIsExample = useSelectionStore((state) => state.setIsExample);
  const lastPoint = useRef<{ lat: number; lon: number } | null>(null);
  const [searchId, setSearchId] = useState<string | null>(null);
  const searchQuery = useParcelQuery(searchId);
  const pickMutation = useParcelByPointMutation();

  const recentParcels = useRecentParcelsStore((state) => state.items);
  const addRecentParcel = useRecentParcelsStore((state) => state.add);

  useEffect(() => {
    if (searchQuery.data) setParcel(searchQuery.data);
  }, [searchQuery.data, setParcel]);

  useEffect(() => {
    if (parcel) addRecentParcel(parcel);
  }, [parcel, addRecentParcel]);

  function search(parcelId: string) {
    pickMutation.reset();
    if (parcelId === searchId) {
      void searchQuery.refetch();
    } else {
      setSearchId(parcelId);
    }
  }

  function handleSearch(parcelId: string) {
    setIsExample(false);
    search(parcelId);
  }

  function handleExample(parcelId: string) {
    setIsExample(true);
    search(parcelId);
  }

  function handlePick(lat: number, lon: number) {
    setIsExample(false);
    setSearchId(null);
    lastPoint.current = { lat, lon };
    pickMutation.mutate({ lat, lon }, { onSuccess: setParcel });
  }

  // T-051: repeat the last failed request (search by ID or map click)
  function handleRetry() {
    if (searchId !== null) search(searchId);
    else if (lastPoint.current) pickMutation.mutate(lastPoint.current, { onSuccess: setParcel });
  }

  const isSearching = searchId !== null && searchQuery.isFetching;
  const isLoading = isSearching || pickMutation.isPending;
  const error = toError(searchId !== null ? searchQuery.error : pickMutation.error);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        // AppLayout: 56 px header + 2 × 32 px main padding, so the map fits a 1280×720 projector
        minHeight: { lg: 'calc(100vh - 120px)' },
        overflowX: 'hidden',
      }}
    >
      <Container
        disableGutters
        maxWidth={false}
        // AppLayout already pads the page, so no extra gutters here (T-026 review)
        sx={{ pr: { lg: 3 }, width: { lg: 480 }, maxWidth: { lg: 480 }, flexShrink: 0 }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="h1" gutterBottom>
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
          <ExampleParcelButton disabled={isLoading} onSelect={handleExample} />
          {error?.canRetry && !isLoading && (
            <Button variant="outlined" onClick={handleRetry} sx={{ minHeight: 44 }}>
              Ponów
            </Button>
          )}
          <RecentParcels
            items={recentParcels}
            currentId={parcel?.id ?? null}
            onSelect={handleSearch}
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
      <Box sx={{ flex: 1, pt: { xs: 2, lg: 0 }, minWidth: 0, display: 'flex' }}>
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
