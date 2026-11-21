// UI-S-009 T-086 Dashboard: account header, tiles with ThreatMap (UI-C-017), parcels, drought, advice, reports, sources (members live on /wspolnicy, fields on /pola)
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import { Box, Button, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useAccountReportsQuery, useRenameAccountMutation } from '@/api/accounts';
import { useAccountParcelsQuery } from '@/api/accountParcels';
import { useReportQuery } from '@/api/analyses';
import { useSources } from '@/api/sources';
import type { DroughtClass, ParcelOverview, Recommendation } from '@/api/types';
import { DashboardTile } from '@/components/DashboardTile/DashboardTile';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { DROUGHT_WORDS, ThreatMap } from '@/components/ThreatMap/ThreatMap';
import { useSessionStore } from '@/store/session';
import { errorMessage } from '@/utils/errorMessages';

// retention first, then agrotechnics, then irrigation
const CATEGORY_ORDER: Record<Recommendation['category'], number> = {
  retention_landscape: 0,
  retention_soil: 0,
  agrotechnics: 1,
  irrigation: 2,
};

const DROUGHT_ORDER: DroughtClass[] = ['severe', 'moderate', 'none', 'unknown'];

const bigText = { fontSize: '1.125rem' } as const;
const linkSx = { ...bigText, minHeight: 48, display: 'inline-flex', alignItems: 'center' } as const;

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('pl-PL');
}

function mostThreatened(items: ParcelOverview[]): ParcelOverview | null {
  const atRisk = items.filter((item) => item.atRisk && item.lastReport);
  atRisk.sort(
    (a, b) =>
      DROUGHT_ORDER.indexOf(a.lastReport?.droughtClass ?? 'unknown') -
      DROUGHT_ORDER.indexOf(b.lastReport?.droughtClass ?? 'unknown'),
  );
  return atRisk[0] ?? null;
}

export function AccountPage() {
  const navigate = useNavigate();
  const { token, accounts, activeAccountId, setActiveAccount } = useSessionStore();
  const accountId = activeAccountId ?? '';
  const rename = useRenameAccountMutation(accountId, token ?? '');
  const reports = useAccountReportsQuery(activeAccountId, token);
  const parcels = useAccountParcelsQuery(activeAccountId, token);
  const sources = useSources();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const renameError = rename.error ? errorMessage(rename.error) : null;

  const items = parcels.data ?? [];
  const atRisk = items.filter((item) => item.atRisk);
  const totalHa = items.reduce((sum, item) => sum + item.parcel.areaHa, 0);
  const countByClass = (value: DroughtClass) =>
    items.filter((item) => (item.lastReport?.droughtClass ?? 'unknown') === value).length;
  const top = mostThreatened(items);
  const topReport = useReportQuery(top?.lastReport?.id);
  const advice = [...(topReport.data?.recommendations ?? [])].sort(
    (a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] || a.order - b.order,
  )[0];

  const openReport = (item: ParcelOverview) => {
    if (item.lastReport) navigate(`/report/${item.lastReport.id}`);
  };
  const retryParcels = () => void parcels.refetch();

  const active = accounts.find((account) => account.id === activeAccountId);

  return (
    <Stack spacing={3} sx={{ maxWidth: 1600, mx: 'auto' }}>
      <Box>
        <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700 }}>
          Pulpit gospodarstwa
        </Typography>
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
        {accounts.length > 1 && (
          <TextField
            select
            label="Aktywne gospodarstwo"
            value={activeAccountId ?? ''}
            onChange={(event) => setActiveAccount(event.target.value)}
            sx={{ mt: 2, minWidth: 260 }}
          >
            {accounts.map((account) => (
              <MenuItem key={account.id} value={account.id} sx={{ minHeight: 48 }}>
                {account.name}
              </MenuItem>
            ))}
          </TextField>
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
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(3, minmax(0, 1fr))' },
        }}
      >
        <DashboardTile
          id="zagrozone-dzialki"
          title="Zagrożone działki"
          isLoading={parcels.isPending}
          isError={parcels.isError}
          onRetry={retryParcels}
          errorText="Nie udało się pobrać działek."
          sx={{ gridColumn: { lg: 'span 2' }, gridRow: { lg: 'span 2' } }}
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
            <Typography sx={bigText}>
              Razem: {totalHa.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} ha
            </Typography>
            <Typography sx={bigText}>Zagrożone: {atRisk.length}</Typography>
          </Stack>
        </DashboardTile>
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
          </Stack>
        </DashboardTile>
        <DashboardTile
          id="najwazniejsze-teraz"
          title="Najważniejsze teraz"
          isLoading={parcels.isPending || (top !== null && topReport.isPending)}
          isError={parcels.isError || topReport.isError}
          onRetry={() => {
            retryParcels();
            void topReport.refetch();
          }}
          isEmpty={top === null || !advice}
          emptyText="Na razie nic pilnego. Gdy działka będzie zagrożona, podpowiemy, co zrobić."
        >
          {top && advice && (
            <Stack spacing={1}>
              <Typography sx={{ ...bigText, fontWeight: 700 }}>{advice.title}</Typography>
              <Typography sx={bigText}>{advice.action}</Typography>
              <Link component={RouterLink} to={`/report/${top.lastReport?.id ?? ''}`} sx={linkSx}>
                {`Działka ${top.parcel.parcelNumber}, ${top.parcel.region} – zobacz raport`}
              </Link>
            </Stack>
          )}
        </DashboardTile>
        <DashboardTile
          id="ostatnie-raporty"
          title="Ostatnie raporty"
          isLoading={reports.isPending}
          isError={reports.isError}
          onRetry={() => void reports.refetch()}
          errorText="Nie udało się pobrać historii raportów."
          isEmpty={(reports.data ?? []).length === 0}
          emptyText="Brak zapisanych raportów."
        >
          <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
            {(reports.data ?? []).slice(0, 3).map((report) => (
              <Box component="li" key={report.id} sx={{ py: 0.5 }}>
                <Link component={RouterLink} to={`/report/${report.id}`} sx={linkSx}>
                  {`${report.parcel.parcelNumber}, ${report.parcel.region} – ${formatDate(report.createdAt)}`}
                </Link>
                <Typography component="span" sx={bigText}>
                  {` · ${DROUGHT_WORDS[report.droughtClass]}`}
                </Typography>
              </Box>
            ))}
          </Box>
        </DashboardTile>
        <DashboardTile
          id="skad-dane"
          title="Skąd dane"
          isLoading={sources.isPending}
          isError={sources.isError}
          onRetry={() => void sources.refetch()}
          isEmpty={(sources.data?.items ?? []).length === 0}
          emptyText="Brak informacji o źródłach."
        >
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            {(sources.data?.items ?? []).map((source) => (
              <Typography component="li" key={source.id} sx={bigText}>
                {`${source.name} (${source.provider})`}
              </Typography>
            ))}
          </Box>
        </DashboardTile>
      </Box>
    </Stack>
  );
}
