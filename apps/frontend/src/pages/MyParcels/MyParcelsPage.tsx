// UI-S-010 My parcels with filters [T-088]: account parcels list (API-020) with client-side checkbox filters
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Alert,
  Box,
  Button,
  Card,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useAccountParcelsQuery } from '@/api/accountParcels';
import type { DroughtClass, ParcelOverview } from '@/api/types';
import {
  EMPTY_FILTERS,
  ParcelFilters,
  countActiveFilters,
  filterParcels,
} from '@/components/ParcelFilters/ParcelFilters';
import type { Filters } from '@/components/ParcelFilters/ParcelFilters';
import { useSessionStore } from '@/store/session';
import { formatNumber } from '@/utils/format';

const DROUGHT: Record<DroughtClass, { label: string; Icon: typeof ErrorOutlineIcon }> = {
  severe: { label: 'Silna susza', Icon: ErrorOutlineIcon },
  moderate: { label: 'Umiarkowana susza', Icon: WarningAmberIcon },
  none: { label: 'Brak suszy', Icon: CheckCircleOutlineIcon },
  unknown: { label: 'Brak danych o suszy', Icon: HelpOutlineIcon },
};

function ParcelRow({ item }: { item: ParcelOverview }) {
  const { parcel, lastReport } = item;
  const drought = lastReport ? DROUGHT[lastReport.droughtClass] : null;
  return (
    <Card
      component="li"
      variant="outlined"
      sx={{
        listStyle: 'none',
        p: 2,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        alignItems: { sm: 'center' },
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="h2"
          sx={{ fontWeight: 800, fontSize: '1.25rem', overflowWrap: 'anywhere' }}
        >
          Działka {parcel.parcelNumber}
        </Typography>
        <Typography sx={{ fontSize: '1.125rem', overflowWrap: 'anywhere' }}>
          {parcel.region} ({parcel.commune}), {formatNumber(parcel.areaHa)} ha
        </Typography>
        <Typography sx={{ fontSize: '1.125rem' }}>
          Uprawa: {lastReport ? lastReport.crop.name : 'Bez raportu'}
        </Typography>
        {drought && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
            <drought.Icon aria-hidden />
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 700 }}>{drought.label}</Typography>
          </Stack>
        )}
      </Box>
      <Stack direction="row" sx={{ flexShrink: 0, flexWrap: 'wrap', gap: 1 }}>
        {lastReport && (
          <Button
            component={RouterLink}
            to={`/report/${lastReport.id}`}
            variant="contained"
            sx={{ minHeight: 48, fontSize: '1.125rem' }}
          >
            Zobacz raport
          </Button>
        )}
        <Button
          component={RouterLink}
          to={`/parcel/${encodeURIComponent(parcel.id)}`}
          variant={lastReport ? 'outlined' : 'contained'}
          sx={{ minHeight: 48, fontSize: '1.125rem' }}
        >
          Sprawdź według plonu
        </Button>
      </Stack>
    </Card>
  );
}

export function MyParcelsPage() {
  const { token, activeAccountId } = useSessionStore();
  const query = useAccountParcelsQuery(activeAccountId, token);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [open, setOpen] = useState(false);
  // T-103: text search above the filters (number, place, commune, crop), combined with the filters
  const [search, setSearch] = useState('');
  const needle = search.trim().toLocaleLowerCase('pl-PL');

  const all = query.data ?? [];
  const shown = filterParcels(all, filters).filter(
    (item) =>
      !needle ||
      [
        item.parcel.parcelNumber,
        item.parcel.id,
        item.parcel.region,
        item.parcel.commune,
        item.lastReport?.crop.name ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase('pl-PL')
        .includes(needle),
  );
  const active = countActiveFilters(filters);

  let content;
  if (query.isLoading) {
    content = (
      <Stack spacing={2} aria-busy="true" aria-label="Wczytuję działki">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} variant="rounded" height={120} />
        ))}
      </Stack>
    );
  } else if (query.isError) {
    content = (
      <Alert
        severity="error"
        role="alert"
        action={
          <Button color="inherit" onClick={() => void query.refetch()} sx={{ minHeight: 48 }}>
            Spróbuj ponownie
          </Button>
        }
        sx={{ fontSize: '1.125rem' }}
      >
        Nie udało się wczytać działek.
      </Alert>
    );
  } else if (all.length === 0) {
    content = (
      <Card variant="outlined" sx={{ p: 3 }}>
        <Typography sx={{ fontSize: '1.25rem', mb: 2 }}>
          Nie masz jeszcze żadnych działek. Sprawdź pierwszą, a pojawi się tutaj.
        </Typography>
        <Button
          component={RouterLink}
          to="/"
          variant="contained"
          sx={{ minHeight: 48, fontSize: '1.125rem' }}
        >
          Sprawdź nową działkę
        </Button>
      </Card>
    );
  } else {
    content = (
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' },
          alignItems: 'start',
        }}
      >
        <Box component="aside" aria-label="Wyszukiwanie i filtry">
          <TextField
            type="search"
            fullWidth
            label="Szukaj działki"
            placeholder="Numer, miejscowość, uprawa"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon aria-hidden />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="Wyczyść wyszukiwanie"
                      onClick={() => setSearch('')}
                      edge="end"
                      sx={{ width: 44, height: 44 }}
                    >
                      <CloseIcon aria-hidden />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
                sx: { fontSize: '1.125rem' },
              },
            }}
            sx={{ mb: 2 }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterListIcon aria-hidden />}
            aria-expanded={open}
            aria-controls="parcel-filters"
            onClick={() => setOpen((value) => !value)}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, minHeight: 48, fontSize: '1.125rem' }}
          >
            Filtry ({active})
          </Button>
          <Box
            id="parcel-filters"
            sx={{ display: { xs: open ? 'block' : 'none', md: 'block' }, mt: { xs: 2, md: 0 } }}
          >
            <ParcelFilters parcels={all} value={filters} onChange={setFilters} />
          </Box>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography aria-live="polite" sx={{ fontSize: '1.125rem', fontWeight: 700, mb: 2 }}>
            Pokazuję {shown.length} z {all.length}
          </Typography>
          {shown.length === 0 ? (
            <Card variant="outlined" sx={{ p: 3 }}>
              <Typography sx={{ fontSize: '1.25rem', mb: 2 }}>Żadna działka nie pasuje</Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setSearch('');
                }}
                sx={{ minHeight: 48, fontSize: '1.125rem' }}
              >
                Wyczyść wyszukiwanie i filtry
              </Button>
            </Card>
          ) : (
            <Stack component="ul" spacing={2} sx={{ p: 0, m: 0 }}>
              {shown.map((item) => (
                <ParcelRow key={item.parcel.id} item={item} />
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 1600, mx: 'auto' }}>
      <Typography variant="h1" component="h1">
        Moje działki
      </Typography>
      {content}
    </Stack>
  );
}
