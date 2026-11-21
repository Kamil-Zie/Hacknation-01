// UI-S-001 Start i wybór działki (krok 1 z 3): search by TERYT ID / address / GPS or map click, selected parcel card, next step button
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TouchAppOutlinedIcon from '@mui/icons-material/TouchAppOutlined';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { useParcelByPointMutation, useParcelQuery } from '@/api/parcels';
import { ExampleParcelButton } from '@/components/ExampleParcelButton/ExampleParcelButton';
import { ParcelMap } from '@/components/ParcelMap/ParcelMap';
import { ParcelSearch } from '@/components/ParcelSearch/ParcelSearch';
import { RecentParcels } from '@/components/RecentParcels/RecentParcels';
import { useRecentParcelsStore } from '@/store/recentParcels';
import { useSelectionStore } from '@/store/selection';
import { errorMessage } from '@/utils/errorMessages';

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
  const [focus, setFocus] = useState<{ lat: number; lon: number } | null>(null);

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
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 560px) minmax(0, 1fr)' },
        gap: { xs: 3, md: 4 },
        alignItems: 'stretch',
      }}
    >
      <Stack spacing={3} component="section" aria-label="Wybór działki">
        <Stack spacing={1.25}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', color: 'primary.main' }}>
            KROK 1 Z 3
          </Typography>
          <Typography variant="h1">Gdzie jest Twoja działka?</Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: '1.125rem', md: '1.25rem' } }}>
            Wpisz numer lub adres, użyj GPS <b>albo</b> kliknij działkę na mapie.
          </Typography>
        </Stack>
        <ParcelSearch
          key={parcel?.id ?? 'empty'}
          defaultValue={parcel?.id}
          isLoading={isLoading}
          error={searchId !== null ? error : null}
          onSearch={handleSearch}
          onLocate={handlePick}
          onPlaceFound={(lat, lon) => setFocus({ lat, lon })}
        />
        {error?.canRetry && !isLoading && (
          <Button variant="outlined" onClick={handleRetry} sx={{ alignSelf: 'flex-start' }}>
            Ponów
          </Button>
        )}
        <ExampleParcelButton disabled={isLoading} onSelect={handleExample} />
        <RecentParcels
          items={recentParcels}
          currentId={parcel?.id ?? null}
          onSelect={handleSearch}
        />
      </Stack>
      <Box
        component="section"
        aria-label="Mapa"
        sx={{
          position: 'relative',
          minWidth: 0,
          minHeight: { xs: 480, md: 560 },
          display: 'flex',
          border: 1,
          borderColor: 'kropla.line',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <ParcelMap
          parcel={parcel}
          focus={focus}
          height="100%"
          isLoading={isLoading}
          errorMessage={searchId === null ? (error?.message ?? null) : null}
          onPick={handlePick}
        />
        <Box
          sx={{
            position: 'absolute',
            top: { xs: 12, md: 24 },
            left: { xs: 56, md: 64 },
            right: { xs: 12, md: 24 },
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.5,
              bgcolor: 'background.paper',
              borderRadius: '12px',
              px: 2,
              py: 1.25,
              boxShadow: 3,
              maxWidth: '100%',
            }}
          >
            <TouchAppOutlinedIcon aria-hidden sx={{ color: 'kropla.iconMuted', flexShrink: 0 }} />
            <Typography sx={{ fontWeight: 600, fontSize: { xs: '1rem', md: '1.125rem' } }}>
              Przybliż mapę i kliknij swoją działkę
            </Typography>
          </Box>
        </Box>
        {parcel && (
          <Box
            sx={{
              position: 'absolute',
              left: { xs: 12, md: 24 },
              right: { xs: 12, md: 24 },
              bottom: { xs: 28, md: 32 },
              zIndex: 1000,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Box
              component="section"
              aria-label="Wybrana działka"
              sx={{
                bgcolor: 'background.paper',
                borderRadius: '16px',
                p: { xs: 2, md: 2.5 },
                boxShadow: 4,
                width: '100%',
                maxWidth: 640,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography color="text.secondary" sx={{ fontSize: '1rem' }}>
                  Wybrana działka
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: '1.375rem',
                    fontVariantNumeric: 'tabular-nums',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {parcel.id}
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: '1rem' }}>
                  {parcel.commune} · {parcel.areaHa.toLocaleString('pl-PL')} ha
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon aria-hidden />}
                onClick={() => navigate(`/parcel/${encodeURIComponent(parcel.id)}`)}
                sx={{ minHeight: 64, px: 3.5, fontSize: '1.3125rem', flexGrow: { xs: 1, sm: 0 } }}
              >
                To moja działka – dalej
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
