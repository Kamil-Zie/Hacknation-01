// UI-S-009 T-093 Dashboard: ThreatMap (UI-C-017) top left without a tile, drought tile + new parcel / quick report (UI-S-014) buttons top right, water balance (UI-C-011) full width below
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useAccountParcelsQuery } from '@/api/accountParcels';
import { useReportQuery } from '@/api/analyses';
import type { DroughtClass, ParcelOverview } from '@/api/types';
import { DashboardTile } from '@/components/DashboardTile/DashboardTile';
import { KbwChart } from '@/components/KbwChart/KbwChart';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { DROUGHT_WORDS, ThreatList, ThreatMap } from '@/components/ThreatMap/ThreatMap';
import { srOnly } from '@/app/a11yStyles';
import { useSessionStore } from '@/store/session';

const DROUGHT_ORDER: DroughtClass[] = ['severe', 'moderate', 'none', 'unknown'];

const bigText = { fontSize: '1.125rem' } as const;
const linkSx = { ...bigText, minHeight: 48, display: 'inline-flex', alignItems: 'center' } as const;

function formatHa(value: number): string {
  return `${value.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} ha`;
}

// parcel for the water-balance chart: at-risk first, then by drought class; only parcels with a report
function mostThreatened(items: ParcelOverview[]): ParcelOverview | null {
  const withReport = items.filter((item) => item.lastReport);
  withReport.sort(
    (a, b) =>
      Number(b.atRisk) - Number(a.atRisk) ||
      DROUGHT_ORDER.indexOf(a.lastReport?.droughtClass ?? 'unknown') -
        DROUGHT_ORDER.indexOf(b.lastReport?.droughtClass ?? 'unknown'),
  );
  return withReport[0] ?? null;
}

export function AccountPage() {
  const navigate = useNavigate();
  const { token, accounts, activeAccountId, setActiveAccount } = useSessionStore();
  const parcels = useAccountParcelsQuery(activeAccountId, token);

  const items = parcels.data ?? [];
  const atRisk = items.filter((item) => item.atRisk);
  const atRiskHa = atRisk.reduce((sum, item) => sum + item.parcel.areaHa, 0);
  const hasParcels = !parcels.isPending && !parcels.isError && items.length > 0;
  const countByClass = (value: DroughtClass) =>
    items.filter((item) => (item.lastReport?.droughtClass ?? 'unknown') === value).length;
  const top = mostThreatened(items);
  const topReport = useReportQuery(top?.lastReport?.id);

  const openReport = (item: ParcelOverview) => {
    if (item.lastReport) navigate(`/report/${item.lastReport.id}`);
  };
  const retryParcels = () => void parcels.refetch();

  const active = accounts.find((account) => account.id === activeAccountId);

  return (
    <Stack spacing={2} sx={{ maxWidth: 1600, mx: 'auto' }}>
      {/* page title for screen readers only; the visible page starts with the map */}
      <Typography variant="h1" component="h1" sx={srOnly}>
        {active?.name ?? 'Pulpit'}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' },
          gridTemplateAreas: {
            xs: '"switch" "title" "map" "side" "chart"',
            lg: '"title switch" "map side" "chart chart"',
          },
          alignItems: 'start',
        }}
      >
        {/* account switcher top right (lg+), top of the page on a phone */}
        {accounts.length > 1 && (
          <TextField
            select
            label="Aktywne gospodarstwo"
            value={activeAccountId ?? ''}
            onChange={(event) => setActiveAccount(event.target.value)}
            sx={{
              gridArea: 'switch',
              justifySelf: { xs: 'stretch', sm: 'start', lg: 'end' },
              alignSelf: 'end',
              minWidth: { sm: 260 },
              maxWidth: '100%',
            }}
          >
            {accounts.map((account) => (
              <MenuItem key={account.id} value={account.id} sx={{ minHeight: 48 }}>
                {account.name}
              </MenuItem>
            ))}
          </TextField>
        )}
        {/* heading in its own row, so the drought tile starts level with the top edge of the map */}
        <Typography
          id="zagrozone-dzialki-title"
          variant="h2"
          component="h2"
          sx={{ gridArea: 'title', alignSelf: 'end', mb: { xs: -0.5, lg: -1 } }}
        >
          Zagrożone działki
        </Typography>
        <Box
          component="section"
          aria-labelledby="zagrozone-dzialki-title"
          sx={{ gridArea: 'map', minWidth: 0 }}
        >
          {parcels.isPending ? (
            <ThreatMap items={[]} isLoading onSelect={openReport} />
          ) : parcels.isError ? (
            <Alert
              severity="error"
              role="alert"
              action={
                <Button color="inherit" sx={{ minHeight: 48 }} onClick={retryParcels}>
                  Spróbuj ponownie
                </Button>
              }
            >
              Nie udało się pobrać działek.
            </Alert>
          ) : items.length === 0 ? (
            <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <Typography sx={bigText}>
                Nie masz jeszcze działek. Dodaj pierwszą, a pokażemy ją tu na mapie.
              </Typography>
              <Button
                component={RouterLink}
                to="/dodaj-dzialke"
                variant="contained"
                startIcon={<AddLocationAltIcon />}
                sx={{ minHeight: 48, fontSize: '1.125rem' }}
              >
                Dodaj działkę
              </Button>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <ThreatMap items={items} onSelect={openReport} />
              {atRisk.length === 0 && (
                <Typography sx={{ ...bigText, fontWeight: 700 }}>
                  Żadna działka nie jest zagrożona
                </Typography>
              )}
            </Stack>
          )}
        </Box>
        {/* one card: two columns from the top edge (drought counts | at-risk list and legend),
            action buttons at the bottom; lg+: same height as the map box in ThreatMap */}
        <Card
          sx={{
            gridArea: 'side',
            alignSelf: 'start',
            minWidth: 0,
            minHeight: { lg: 'max(360px, 45vh)' },
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  sm: hasParcels ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)',
                },
                alignItems: 'start',
              }}
            >
              <Stack component="section" aria-labelledby="stan-suszy-title" spacing={2}>
                <Typography id="stan-suszy-title" variant="h2" component="h2">
                  Stan suszy
                </Typography>
                {parcels.isPending ? (
                  <Stack spacing={1} aria-label="Ładowanie: Stan suszy">
                    <Skeleton variant="rounded" height={32} />
                    <Skeleton variant="rounded" height={32} width="70%" />
                  </Stack>
                ) : parcels.isError ? (
                  <Alert
                    severity="error"
                    role="alert"
                    action={
                      <Button color="inherit" sx={{ minHeight: 48 }} onClick={retryParcels}>
                        Spróbuj ponownie
                      </Button>
                    }
                  >
                    Nie udało się pobrać danych.
                  </Alert>
                ) : !hasParcels ? (
                  <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <Typography sx={bigText}>
                      Stan suszy pokażemy po sprawdzeniu pierwszej działki.
                    </Typography>
                    <Link component={RouterLink} to="/" sx={linkSx}>
                      Sprawdź działkę
                    </Link>
                  </Stack>
                ) : (
                  <Stack spacing={1}>
                    {DROUGHT_ORDER.map((value) => (
                      <Stack key={value} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <StatusBadge kind="drought" value={value} label={DROUGHT_WORDS[value]} />
                        <Typography sx={bigText}>{countByClass(value)}</Typography>
                      </Stack>
                    ))}
                    <Typography
                      sx={{
                        ...bigText,
                        fontWeight: 700,
                        pt: 1,
                        borderTop: 1,
                        borderColor: 'divider',
                      }}
                    >
                      Zagrożony obszar: {formatHa(atRiskHa)}
                    </Typography>
                  </Stack>
                )}
              </Stack>
              {hasParcels && <ThreatList items={items} onSelect={openReport} />}
            </Box>
            {/* two equal buttons across the full tile width, side by side; they stack only when too narrow */}
            <Box
              sx={{
                mt: 'auto',
                pt: 2,
                borderTop: 1,
                borderColor: 'divider',
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))',
              }}
            >
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<AddLocationAltIcon />}
                onClick={() => navigate('/')}
                sx={{ minHeight: 56, fontSize: '1.125rem', whiteSpace: 'nowrap' }}
              >
                Sprawdź nową działkę
              </Button>
              <Button
                component={RouterLink}
                to="/szybki-raport"
                variant="outlined"
                size="large"
                fullWidth
                startIcon={<PlaylistAddCheckIcon />}
                sx={{ minHeight: 56, fontSize: '1.125rem', whiteSpace: 'nowrap' }}
              >
                Szybki raport
              </Button>
            </Box>
          </CardContent>
        </Card>
        <DashboardTile
          id="bilans-wody"
          title={top ? `Bilans wody · działka ${top.parcel.parcelNumber}` : 'Bilans wody'}
          isLoading={parcels.isPending || (top !== null && topReport.isPending)}
          isError={parcels.isError || topReport.isError}
          errorText="Nie udało się pobrać wykresu bilansu wody."
          onRetry={() => {
            retryParcels();
            void topReport.refetch();
          }}
          sx={{ gridArea: 'chart' }}
        >
          {top && topReport.data ? (
            <Stack spacing={1}>
              <KbwChart charts={topReport.data.charts} />
              <Link component={RouterLink} to={`/report/${top.lastReport?.id ?? ''}`} sx={linkSx}>
                Pełny raport
              </Link>
            </Stack>
          ) : (
            <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
              <Typography sx={bigText}>
                Wykres pokażemy, gdy sprawdzisz działkę i powstanie jej raport.
              </Typography>
              <Link component={RouterLink} to="/" sx={linkSx}>
                Sprawdź działkę
              </Link>
            </Stack>
          )}
        </DashboardTile>
      </Box>
    </Stack>
  );
}
