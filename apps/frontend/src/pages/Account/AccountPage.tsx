// UI-S-009 T-093 Dashboard: account header, 2×2 grid with ThreatMap (UI-C-017), drought + parcels, water balance (UI-C-011), quick report link (UI-S-014)
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import { Box, Button, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useRenameAccountMutation } from '@/api/accounts';
import { useAccountParcelsQuery } from '@/api/accountParcels';
import { useReportQuery } from '@/api/analyses';
import type { DroughtClass, ParcelOverview } from '@/api/types';
import { DashboardTile } from '@/components/DashboardTile/DashboardTile';
import { KbwChart } from '@/components/KbwChart/KbwChart';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { DROUGHT_WORDS, ThreatMap } from '@/components/ThreatMap/ThreatMap';
import { useSessionStore } from '@/store/session';
import { errorMessage } from '@/utils/errorMessages';

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
  const accountId = activeAccountId ?? '';
  const rename = useRenameAccountMutation(accountId, token ?? '');
  const parcels = useAccountParcelsQuery(activeAccountId, token);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const renameError = rename.error ? errorMessage(rename.error) : null;

  const items = parcels.data ?? [];
  const atRisk = items.filter((item) => item.atRisk);
  const totalHa = items.reduce((sum, item) => sum + item.parcel.areaHa, 0);
  const atRiskHa = atRisk.reduce((sum, item) => sum + item.parcel.areaHa, 0);
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
    <Stack spacing={3} sx={{ maxWidth: 1600, mx: 'auto' }}>
      <Box>
        {isEditing && active ? (
          <Stack
            component="form"
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              rename.mutate(draft, { onSuccess: () => setIsEditing(false) });
            }}
            sx={{ alignItems: { sm: 'flex-start' } }}
          >
            <TextField
              label="Nazwa gospodarstwa"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              autoFocus
              disabled={rename.isPending}
              error={Boolean(rename.error)}
              helperText={renameError?.message}
              slotProps={{
                htmlInput: { maxLength: 120 },
                formHelperText: { role: renameError ? 'alert' : undefined },
              }}
              sx={{ flexGrow: 1, maxWidth: 480 }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={rename.isPending || !draft.trim()}
              sx={{ minHeight: 48 }}
            >
              {rename.isPending ? 'Zapisuję…' : 'Zapisz'}
            </Button>
            <Button
              variant="text"
              disabled={rename.isPending}
              onClick={() => setIsEditing(false)}
              sx={{ minHeight: 48 }}
            >
              Anuluj
            </Button>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h1" component="h1" sx={{ overflowWrap: 'anywhere' }}>
              {active?.name ?? 'Gospodarstwo'}
            </Typography>
            {active && (
              <Button
                variant="outlined"
                onClick={() => {
                  rename.reset();
                  setDraft(active.name);
                  setIsEditing(true);
                }}
                sx={{ minHeight: 48 }}
              >
                Zmień nazwę
              </Button>
            )}
          </Stack>
        )}
      </Box>
      <Button
        variant="contained"
        size="large"
        startIcon={<AddLocationAltIcon />}
        onClick={() => navigate('/')}
        sx={{ minHeight: 64, fontSize: '1.25rem', alignSelf: { sm: 'flex-start' }, px: 4 }}
      >
        Sprawdź nową działkę
      </Button>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' },
          gridTemplateAreas: {
            xs: '"map" "side" "chart" "quick"',
            lg: '"map side" "chart quick"',
          },
        }}
      >
        <DashboardTile
          id="zagrozone-dzialki"
          title="Zagrożone działki"
          isLoading={parcels.isPending}
          isError={parcels.isError}
          onRetry={retryParcels}
          errorText="Nie udało się pobrać działek."
          sx={{ gridArea: 'map' }}
        >
          {items.length === 0 ? (
            <Typography sx={bigText}>
              Nie masz jeszcze działek. Sprawdź pierwszą działkę.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {atRisk.length === 0 && (
                <Typography sx={{ ...bigText, fontWeight: 700 }}>
                  Żadna działka nie jest zagrożona
                </Typography>
              )}
              <ThreatMap items={items} onSelect={openReport} />
            </Stack>
          )}
        </DashboardTile>
        <Stack spacing={3} sx={{ gridArea: 'side', minWidth: 0 }}>
          <DashboardTile
            id="stan-suszy"
            title="Stan suszy"
            isLoading={parcels.isPending}
            isError={parcels.isError}
            onRetry={retryParcels}
            isEmpty={items.length === 0}
            emptyText="Brak działek do oceny."
          >
            <Stack spacing={1}>
              {DROUGHT_ORDER.map((value) => (
                <Stack key={value} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <StatusBadge kind="drought" value={value} label={DROUGHT_WORDS[value]} />
                  <Typography sx={bigText}>{countByClass(value)}</Typography>
                </Stack>
              ))}
              <Typography
                sx={{ ...bigText, fontWeight: 700, pt: 1, borderTop: 1, borderColor: 'divider' }}
              >
                Zagrożony obszar: {formatHa(atRiskHa)}
              </Typography>
            </Stack>
          </DashboardTile>
          <DashboardTile
            id="twoje-dzialki"
            title="Twoje działki"
            isLoading={parcels.isPending}
            isError={parcels.isError}
            onRetry={retryParcels}
            isEmpty={items.length === 0}
            emptyText="Nie masz jeszcze działek."
          >
            <Stack spacing={0.5}>
              <Typography sx={bigText}>Liczba działek: {items.length}</Typography>
              <Typography sx={bigText}>Razem: {formatHa(totalHa)}</Typography>
              <Link component={RouterLink} to="/dzialki" sx={linkSx}>
                Zobacz wszystkie działki
              </Link>
            </Stack>
          </DashboardTile>
        </Stack>
        <DashboardTile
          id="bilans-wody"
          title="Bilans wody"
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
              <Typography sx={bigText}>
                {`Działka ${top.parcel.parcelNumber}, ${top.parcel.region}`}
                {top.lastReport ? ` · ${top.lastReport.crop.name}` : ''}
              </Typography>
              <KbwChart charts={topReport.data.charts} />
              <Link component={RouterLink} to={`/report/${top.lastReport?.id ?? ''}`} sx={linkSx}>
                Zobacz pełny raport
              </Link>
            </Stack>
          ) : (
            <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
              <Typography sx={bigText}>
                Brak raportu. Sprawdź działkę, a pokażemy tu jej bilans wody.
              </Typography>
              <Link component={RouterLink} to="/" sx={linkSx}>
                Sprawdź działkę
              </Link>
            </Stack>
          )}
        </DashboardTile>
        <DashboardTile
          id="szybki-raport"
          title="Szybki raport"
          sx={{ gridArea: 'quick', alignSelf: 'start' }}
        >
          <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Typography sx={bigText}>Sprawdź kilka działek naraz, do 5 jednocześnie.</Typography>
            <Button
              component={RouterLink}
              to="/szybki-raport"
              variant="contained"
              size="large"
              startIcon={<PlaylistAddCheckIcon />}
              sx={{ minHeight: 64, fontSize: '1.25rem', px: 4 }}
            >
              Szybki raport
            </Button>
          </Stack>
        </DashboardTile>
      </Box>
      {accounts.length > 1 && (
        <TextField
          select
          label="Aktywne gospodarstwo"
          value={activeAccountId ?? ''}
          onChange={(event) => setActiveAccount(event.target.value)}
          sx={{ minWidth: 260, alignSelf: 'flex-start' }}
        >
          {accounts.map((account) => (
            <MenuItem key={account.id} value={account.id} sx={{ minHeight: 48 }}>
              {account.name}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Stack>
  );
}
