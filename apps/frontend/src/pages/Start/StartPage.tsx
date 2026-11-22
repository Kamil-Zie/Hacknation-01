// UI-S-001 Start i wybór działki (krok 1 z 3): same search as „Dodaj działkę” (number / address / GPS / map as the 4th option), selected parcel card, next step button (guest: „To moja działka” locked)
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { useParcelByPointMutation, useParcelQuery } from '@/api/parcels';
import { ExampleParcelButton } from '@/components/ExampleParcelButton/ExampleParcelButton';
import { GuestNotice } from '@/components/GuestNotice/GuestNotice';
import { ParcelMap } from '@/components/ParcelMap/ParcelMap';
import { ParcelSearch } from '@/components/ParcelSearch/ParcelSearch';
import { RecentParcels } from '@/components/RecentParcels/RecentParcels';
import { useRecentParcelsStore } from '@/store/recentParcels';
import { useSelectionStore } from '@/store/selection';
import { useSessionStore } from '@/store/session';
import { errorMessage } from '@/utils/errorMessages';
import { formatPlaceName } from '@/utils/format';

function toError(error: unknown): { code: string; message: string; canRetry: boolean } | null {
  if (!error) return null;
  const { message, canRetry } = errorMessage(error);
  return { code: error instanceof ApiError ? error.code : 'UNKNOWN', message, canRetry };
}

export function StartPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isGuest = !useSessionStore((state) => state.token);
  const parcel = useSelectionStore((state) => state.parcel);
  const setParcel = useSelectionStore((state) => state.setParcel);
  const setIsExample = useSelectionStore((state) => state.setIsExample);
  const lastPoint = useRef<{ lat: number; lon: number } | null>(null);
  const [searchId, setSearchId] = useState<string | null>(null);
  const searchQuery = useParcelQuery(searchId);
  const pickMutation = useParcelByPointMutation();
  const [focus, setFocus] = useState<{
    lat: number;
    lon: number;
    bounds?: [[number, number], [number, number]];
  } | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const [isPickedOnMap, setIsPickedOnMap] = useState(false);

  // T-058 "Dodaj działkę" navigates here with a reset stamp: forget the previous search
  const resetStamp = (location.state as { resetAt?: number } | null)?.resetAt;
  useEffect(() => {
    if (resetStamp) {
      setSearchId(null);
      setFocus(null);
    }
  }, [resetStamp]);

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
    setIsPickedOnMap(false);
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
    setIsPickedOnMap(true);
    lastPoint.current = { lat, lon };
    pickMutation.mutate(
      { lat, lon },
      {
        onSuccess: (picked) => {
          setParcel(picked);
          setFocusKey((key) => key + 1);
        },
      },
    );
  }

  // T-051: repeat the last failed request (search by ID or map click)
  function handleRetry() {
    if (searchId !== null) search(searchId);
    else if (lastPoint.current) pickMutation.mutate(lastPoint.current, { onSuccess: setParcel });
  }

  const goNext = () => parcel && navigate(`/parcel/${encodeURIComponent(parcel.id)}`);

  const isSearching = searchId !== null && searchQuery.isFetching;
  const isLoading = isSearching || pickMutation.isPending;
  const byId = searchId !== null;
  const error = toError(byId ? searchQuery.error : pickMutation.error);

  return (
    <Box sx={{ maxWidth: 960 }}>
      <Stack spacing={3} component="section" aria-label="Wybór działki">
        <Stack spacing={1.25}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', color: 'primary.main' }}>
            KROK 1 Z 3
          </Typography>
          <Typography variant="h1">Gdzie jest Twoja działka?</Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: '1.125rem', md: '1.25rem' } }}>
            Znajdź działkę po numerze, adresie, GPS albo na mapie.
          </Typography>
        </Stack>
        <GuestNotice>
          aby zapisywać działki i raporty. Bez logowania możesz sprawdzić raport dowolnej działki.
        </GuestNotice>
        <ParcelSearch
          key={parcel?.id ?? 'empty'}
          defaultValue={parcel?.id}
          defaultMode={isPickedOnMap ? 'map' : 'number'}
          isLoading={isLoading}
          error={byId ? error : null}
          pickError={byId ? null : error}
          onSearch={handleSearch}
          onLocate={handlePick}
          onPlaceFound={(lat, lon, bounds) => setFocus({ lat, lon, bounds })}
          mapSlot={
            <Box
              component="section"
              aria-label="Mapa: kliknij swoją działkę"
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
                focusKey={focusKey}
                height={{ xs: 320, md: 480 }}
                isLoading={isLoading}
                errorMessage={null}
                layerToggleInCorner
                showParcelBoundaries
                onPick={handlePick}
              />
            </Box>
          }
        />
        {error?.canRetry && !isLoading && (
          <Button
            variant="outlined"
            onClick={handleRetry}
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
            <Box component="dl" sx={{ m: 0, display: 'grid', gap: 1, mb: 2.5 }}>
              {[
                ['Numer działki', parcel.parcelNumber],
                ['Miejscowość', formatPlaceName(parcel.region)],
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
            {isGuest ? (
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForwardIcon aria-hidden />}
                    onClick={goNext}
                    sx={{ minHeight: 64, px: 3.5, fontSize: '1.3125rem' }}
                  >
                    Sprawdź tę działkę – dalej
                  </Button>
                  {/* guest mode: claiming the parcel needs an account */}
                  <Button
                    variant="outlined"
                    size="large"
                    disabled
                    startIcon={<LockOutlinedIcon aria-hidden />}
                    sx={{ minHeight: 64, px: 3, fontSize: '1.125rem' }}
                  >
                    To moja działka
                  </Button>
                </Stack>
                <GuestNotice>aby zapisać tę działkę jako swoją.</GuestNotice>
              </Stack>
            ) : (
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon aria-hidden />}
                onClick={goNext}
                sx={{ minHeight: 64, px: 3.5, fontSize: '1.3125rem' }}
              >
                To moja działka – dalej
              </Button>
            )}
          </Box>
        )}
        <ExampleParcelButton disabled={isLoading} onSelect={handleExample} />
        <RecentParcels
          items={recentParcels}
          currentId={parcel?.id ?? null}
          onSelect={handleSearch}
        />
      </Stack>
    </Box>
  );
}
