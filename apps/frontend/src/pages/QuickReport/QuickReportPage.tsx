// UI-S-014 T-096 Quick report: pick up to 5 parcels of the account (API-020) and run their analyses (API-003/API-004) one by one
import PrintIcon from '@mui/icons-material/Print';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useAccountParcelsQuery } from '@/api/accountParcels';
import { useCreateAnalysisMutation } from '@/api/analyses';
import { useCrops } from '@/api/crops';
import type { CropCode, DroughtClass, ParcelOverview } from '@/api/types';
import { getTodayIso } from '@/components/AnalysisForm/AnalysisForm.schema';
import { CropIcon } from '@/components/CropIcon/CropIcon';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { useSessionStore } from '@/store/session';
import { errorMessage } from '@/utils/errorMessages';

const MAX_PARCELS = 5;

interface Outcome {
  reportId?: string;
  droughtClass?: DroughtClass;
  error?: string;
}

const textSx = { fontSize: '1.125rem' } as const;

function parcelTitle(item: ParcelOverview): string {
  return `Działka ${item.parcel.parcelNumber}, ${item.parcel.region}`;
}

export function QuickReportPage() {
  const { token, activeAccountId } = useSessionStore();
  const query = useAccountParcelsQuery(activeAccountId, token);
  const crops = useCrops();
  const createAnalysis = useCreateAnalysisMutation();
  const [selected, setSelected] = useState<string[]>([]);
  const [chosenCrops, setChosenCrops] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome> | null>(null);
  const [queue, setQueue] = useState<ParcelOverview[]>([]);

  const items = query.data ?? [];
  const cropFor = (item: ParcelOverview) =>
    item.lastReport?.crop.code ?? chosenCrops[item.parcel.id] ?? '';
  const chosen = items.filter((item) => selected.includes(item.parcel.id));
  const isReady = chosen.length > 0 && chosen.every((item) => cropFor(item) !== '');
  const isLimit = selected.length >= MAX_PARCELS;

  function toggle(id: string) {
    setSelected((list) => (list.includes(id) ? list.filter((e) => e !== id) : [...list, id]));
  }

  async function run() {
    if (!activeAccountId || !token) return;
    const results: Record<string, Outcome> = {};
    setQueue(chosen);
    setIsRunning(true);
    setDone(0);
    setTotal(chosen.length);
    setOutcomes({});
    for (const item of chosen) {
      try {
        const report = await createAnalysis.mutateAsync({
          request: {
            parcelId: item.parcel.id,
            cropCode: cropFor(item) as CropCode,
            analysisDate: getTodayIso(),
            accountId: activeAccountId,
          },
          options: { accountId: activeAccountId, token },
        });
        results[item.parcel.id] = {
          reportId: report.id,
          droughtClass: report.assessment.droughtClass,
        };
      } catch (error) {
        results[item.parcel.id] = { error: errorMessage(error).message };
      }
      setOutcomes({ ...results });
      setDone((count) => count + 1);
    }
    setIsRunning(false);
  }

  function reset() {
    setSelected([]);
    setChosenCrops({});
    setOutcomes(null);
    setQueue([]);
    setDone(0);
    setTotal(0);
  }

  let body;
  if (query.isLoading) {
    body = (
      <Stack spacing={1.5} aria-busy="true">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} variant="rounded" height={88} />
        ))}
      </Stack>
    );
  } else if (query.isError) {
    body = (
      <Alert
        severity="error"
        role="alert"
        sx={textSx}
        action={
          <Button color="inherit" onClick={() => void query.refetch()} sx={{ minHeight: 48 }}>
            Spróbuj ponownie
          </Button>
        }
      >
        {errorMessage(query.error).message}
      </Alert>
    );
  } else if (items.length === 0) {
    body = (
      <Stack spacing={2} alignItems="flex-start">
        <Typography sx={textSx}>Nie masz jeszcze działek.</Typography>
        <Button
          component={RouterLink}
          to="/dodaj-dzialke"
          variant="contained"
          sx={{ minHeight: 48, fontSize: '1.125rem' }}
        >
          Dodaj działkę
        </Button>
      </Stack>
    );
  } else if (outcomes === null) {
    body = (
      <Stack spacing={2.5}>
        <Typography sx={textSx}>
          Zaznacz działki (najwyżej {MAX_PARCELS}). Zrobimy raport dla każdej po kolei.
        </Typography>
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {items.map((item) => {
            const id = item.parcel.id;
            const isChecked = selected.includes(id);
            const isBlocked = !isChecked && isLimit;
            const needsCrop = isChecked && !item.lastReport;
            return (
              <Box
                component="li"
                key={id}
                sx={{ borderBottom: 1, borderColor: 'kropla.line', py: 0.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Checkbox
                    checked={isChecked}
                    disabled={isBlocked}
                    onChange={() => toggle(id)}
                    slotProps={{
                      input: {
                        'aria-label': parcelTitle(item),
                        'aria-describedby': isBlocked ? 'limit-hint' : undefined,
                      },
                    }}
                    sx={{ p: 1.5, '& .MuiSvgIcon-root': { fontSize: 32 } }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0, minHeight: 48, py: 1 }}>
                    <Typography sx={{ ...textSx, fontWeight: 700, overflowWrap: 'anywhere' }}>
                      {parcelTitle(item)}
                    </Typography>
                    {item.lastReport ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CropIcon cropCode={item.lastReport.crop.code} sx={{ fontSize: 28 }} />
                        <Typography sx={textSx}>{item.lastReport.crop.name}</Typography>
                      </Box>
                    ) : (
                      <Typography color="text.secondary" sx={textSx}>
                        Bez raportu
                      </Typography>
                    )}
                  </Box>
                </Box>
                {needsCrop && (
                  <TextField
                    select
                    required
                    label="Co rośnie na tej działce?"
                    value={chosenCrops[id] ?? ''}
                    onChange={(event) =>
                      setChosenCrops((map) => ({ ...map, [id]: event.target.value }))
                    }
                    // T-100 native select: no popup menu to close, so one click on "Zrób raport" runs the analyses
                    slotProps={{
                      select: { native: true },
                      input: { sx: { minHeight: 56, fontSize: '1.125rem' } },
                      inputLabel: { shrink: true, sx: textSx },
                    }}
                    sx={{ ml: { xs: 0, sm: 7 }, mb: 1.5, width: { xs: '100%', sm: 360 } }}
                  >
                    <option value="" disabled>
                      Wybierz uprawę
                    </option>
                    {(crops.data?.items ?? []).map((crop) => (
                      <option key={crop.code} value={crop.code}>
                        {crop.name}
                      </option>
                    ))}
                  </TextField>
                )}
              </Box>
            );
          })}
        </Box>
        {isLimit && (
          <Typography id="limit-hint" sx={{ ...textSx, fontWeight: 700 }}>
            Możesz wybrać najwyżej {MAX_PARCELS} działek
          </Typography>
        )}
        <Button
          variant="contained"
          size="large"
          disabled={!isReady}
          onClick={() => void run()}
          sx={{ minHeight: 56, fontSize: '1.25rem', alignSelf: { sm: 'flex-start' } }}
        >
          Zrób raport
        </Button>
      </Stack>
    );
  } else {
    const readyIds = queue.flatMap((item) => {
      const reportId = outcomes[item.parcel.id]?.reportId;
      return reportId ? [reportId] : [];
    });
    body = (
      <Stack spacing={2.5}>
        <Box role="status" aria-live="polite">
          <Typography sx={{ ...textSx, fontWeight: 700 }}>
            {isRunning ? `Robię raport: ${done} z ${total}` : `Gotowe: ${done} z ${total}`}
          </Typography>
        </Box>
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {queue.map((item) => {
            const outcome = outcomes[item.parcel.id];
            return (
              <Box
                component="li"
                key={item.parcel.id}
                sx={{ borderBottom: 1, borderColor: 'kropla.line', py: 1.5 }}
              >
                <Typography sx={{ ...textSx, fontWeight: 700, overflowWrap: 'anywhere' }}>
                  {parcelTitle(item)}
                </Typography>
                {!outcome && <Typography sx={textSx}>Czeka na swoją kolej…</Typography>}
                {outcome?.error && (
                  <Typography role="alert" color="error" sx={textSx}>
                    {outcome.error}
                  </Typography>
                )}
                {outcome?.reportId && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 1.5,
                      mt: 0.5,
                    }}
                  >
                    <StatusBadge kind="drought" value={outcome.droughtClass ?? 'unknown'} />
                    <Button
                      component={RouterLink}
                      to={`/report/${outcome.reportId}`}
                      sx={{ minHeight: 48, fontSize: '1.125rem' }}
                    >
                      Otwórz raport
                    </Button>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {/* T-100 one printout with all ready reports; new tab keeps these results on screen */}
          {!isRunning && readyIds.length > 0 && (
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              href={`/szybki-raport/druk?ids=${readyIds.map(encodeURIComponent).join(',')}`}
              target="_blank"
              rel="noopener"
              sx={{ minHeight: 56, fontSize: '1.25rem' }}
            >
              Drukuj wszystkie
            </Button>
          )}
          <Button
            variant="outlined"
            disabled={isRunning}
            onClick={reset}
            sx={{ minHeight: 56, fontSize: '1.25rem' }}
          >
            Nowy szybki raport
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', width: '100%', px: { xs: 2, md: 0 }, py: 3 }}>
      <Typography variant="h1" component="h1" sx={{ mb: 2 }}>
        Szybki raport
      </Typography>
      {body}
    </Box>
  );
}
