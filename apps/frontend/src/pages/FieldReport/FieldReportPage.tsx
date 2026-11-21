// UI-S-008 Raport pola: uprawa i dzień, liczenie działek (API-019), wynik z mapą, podsumowaniem i kartami działek
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import EventIcon from '@mui/icons-material/EventOutlined';
import GrassIcon from '@mui/icons-material/Grass';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import { Alert, Box, Button, LinearProgress, Skeleton, Stack, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { useCrops } from '@/api/crops';
import {
  FIELD_REPORTS_KEY,
  fieldReportErrorMessage,
  useCreateFieldReportMutation,
  useParcelOutlines,
} from '@/api/fieldReports';
import type { DroughtClass, FieldReport, FieldReportParcel } from '@/api/types';
import { AlertLabel } from '@/components/AlertLabel/AlertLabel';
import { AnalysisForm } from '@/components/AnalysisForm/AnalysisForm';
import { FieldMap } from '@/components/FieldMap/FieldMap';
import type { FieldMapShape } from '@/components/FieldMap/FieldMap';
import { SectionCard } from '@/components/SectionCard/SectionCard';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { formatDate, formatNumber, formatWithUnit } from '@/utils/format';
import type { AlertLevel } from '@/utils/reportState';

const CLASS_LEVEL: Record<DroughtClass, AlertLevel> = {
  severe: 'high',
  moderate: 'medium',
  none: 'ok',
  unknown: 'unknown',
};
const CLASS_WORD: Record<DroughtClass, string> = {
  severe: 'Susza silna',
  moderate: 'Susza umiarkowana',
  none: 'Brak suszy',
  unknown: 'Brak danych',
};
const PRIORITY_WORD = { high: 'Bardzo ważne', medium: 'Średnio ważne', low: 'Mało ważne' };

/** "061409_2.0009.612" -> "612" */
function parcelNumber(parcelId: string): string {
  return parcelId.split('.').pop() ?? parcelId;
}

/** Prefers parcelNumber from the API (DM-025); parses the id only as a fallback */
function numberOfParcel(parcel: FieldReportParcel): string {
  return parcel.parcelNumber || parcelNumber(parcel.parcelId);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: '1.125rem', color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="metric" component="p" sx={{ m: 0, overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
    </Box>
  );
}

function SummaryCard({ report }: { report: FieldReport }) {
  const { summary } = report;
  const isSevere = summary.droughtClass === 'severe';
  const inDrought = summary.severeAreaPct + summary.moderateAreaPct;
  return (
    <Box
      component="section"
      aria-labelledby="field-summary-title"
      sx={{
        bgcolor: isSevere ? 'kropla.severeBg' : 'background.paper',
        border: isSevere ? 4 : 1,
        borderColor: isSevere ? 'kropla.alertHigh' : 'kropla.line',
        borderRadius: '18px',
        p: { xs: 2, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        breakInside: 'avoid',
      }}
    >
      <Typography
        id="field-summary-title"
        variant="h2"
        component="h2"
        sx={{ fontSize: '1.625rem' }}
      >
        Jak jest na całym polu
      </Typography>
      <Box>
        <AlertLabel
          size="large"
          level={CLASS_LEVEL[summary.droughtClass]}
          label={`Najgorzej: ${CLASS_WORD[summary.droughtClass].toLowerCase()}`}
        />
      </Box>
      <Typography sx={{ fontSize: '1.25rem', maxWidth: '60ch' }}>
        {inDrought > 0
          ? `Susza obejmuje ${formatNumber(inDrought, 0)}% powierzchni pola.`
          : 'Na żadnej części pola nie ma suszy.'}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' },
        }}
      >
        <Stat label="Susza silna" value={`${formatNumber(summary.severeAreaPct, 0)}% pola`} />
        <Stat
          label="Susza umiarkowana"
          value={`${formatNumber(summary.moderateAreaPct, 0)}% pola`}
        />
        <Stat
          label="Woda w korzeniach (średnia)"
          value={formatWithUnit(summary.rootZonePctWeighted, '%', 0)}
        />
        <Stat
          label="Brak wody (średnia)"
          value={formatWithUnit(summary.deficitMmWeighted, 'mm', 0)}
        />
      </Box>
      <Typography color="text.secondary" sx={{ fontSize: '1.0625rem' }}>
        Średnie liczone z uwzględnieniem wielkości działek. Działki, których nie udało się policzyć,
        nie wchodzą do średniej.
      </Typography>
      <Box>
        <StatusBadge kind="confidence" value={summary.confidence} />
      </Box>
    </Box>
  );
}

function ParcelCard({ parcel }: { parcel: FieldReportParcel }) {
  const isFailed = parcel.status === 'failed';
  return (
    <Box
      component="li"
      sx={{
        listStyle: 'none',
        bgcolor: 'background.paper',
        border: isFailed ? 3 : 1,
        borderStyle: isFailed ? 'dashed' : 'solid',
        borderColor: isFailed ? 'drought.unknown' : 'kropla.line',
        borderRadius: '16px',
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        minWidth: 0,
        breakInside: 'avoid',
      }}
    >
      <Typography variant="h3" component="h3" sx={{ fontSize: '1.5rem', fontWeight: 800 }}>
        Działka {numberOfParcel(parcel)}
      </Typography>
      <Typography sx={{ fontSize: '1.125rem' }}>
        <b>{formatNumber(parcel.areaHa, 2)} ha</b>
      </Typography>
      {isFailed ? (
        <>
          <Box>
            <AlertLabel level="unknown" label="Nie udało się policzyć" />
          </Box>
          <Typography sx={{ fontSize: '1.125rem' }}>
            {parcel.errorMessage ?? 'Nie udało się pobrać danych dla tej działki.'} Pozostałe
            działki są policzone.
          </Typography>
        </>
      ) : (
        <>
          <Box>
            <AlertLabel
              level={CLASS_LEVEL[parcel.droughtClass]}
              label={CLASS_WORD[parcel.droughtClass]}
            />
          </Box>
          <Typography sx={{ fontSize: '1.125rem' }}>
            Woda w korzeniach: <b>{formatWithUnit(parcel.rootZonePct, '%', 0)}</b>
            <br />
            Brak wody: <b>{formatWithUnit(parcel.deficitMm, 'mm', 0)}</b>
          </Typography>
          {parcel.status === 'partial' && (
            <Typography color="text.secondary">Część źródeł danych nie odpowiedziała.</Typography>
          )}
          {parcel.reportId && (
            <Button
              component={RouterLink}
              to={`/report/${encodeURIComponent(parcel.reportId)}`}
              variant="outlined"
              className="no-print"
              sx={{ minHeight: 52, fontSize: '1.0625rem', alignSelf: 'flex-start' }}
            >
              Zobacz raport działki
            </Button>
          )}
        </>
      )}
    </Box>
  );
}

function Legend() {
  const classes: DroughtClass[] = ['severe', 'moderate', 'none', 'unknown'];
  return (
    <Box
      component="ul"
      aria-label="Legenda mapy"
      sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, p: 0, m: 0, listStyle: 'none' }}
    >
      {classes.map((value) => (
        <li key={value}>
          <AlertLabel level={CLASS_LEVEL[value]} label={CLASS_WORD[value]} />
        </li>
      ))}
    </Box>
  );
}

function FieldResult({ report, onNew }: { report: FieldReport; onNew: () => void }) {
  const outlines = useParcelOutlines(report.parcels.map((parcel) => parcel.parcelId));
  const shapes: FieldMapShape[] = useMemo(
    () =>
      report.parcels.map((parcel, index) => ({
        id: parcel.parcelId,
        label: `${numberOfParcel(parcel)} · ${
          parcel.status === 'failed' ? 'Nie policzono' : CLASS_WORD[parcel.droughtClass]
        }`,
        droughtClass: parcel.status === 'failed' ? 'unknown' : parcel.droughtClass,
        geometry: outlines[index]?.data ?? null,
      })),
    // outlines is a new array every render; depend on the loaded data only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report.parcels, outlines.map((query) => query.data).join('|')],
  );
  const isOutlineMissing = outlines.some((query) => query.isError);
  const failedCount = report.parcels.filter((parcel) => parcel.status === 'failed').length;
  const numberOf = (id: string) => {
    const found = report.parcels.find((parcel) => parcel.parcelId === id);
    return found ? numberOfParcel(found) : parcelNumber(id);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2.5, md: 3.5 },
        maxWidth: 1600,
        mx: 'auto',
        width: '100%',
      }}
    >
      <Box component="header" sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px 32px',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'primary.main' }}>
              RAPORT POLA
            </Typography>
            <Typography variant="h1" component="h1" sx={{ overflowWrap: 'anywhere' }}>
              Raport wody: {report.name}
            </Typography>
          </Box>
          <Stack
            direction="row"
            className="no-print"
            role="toolbar"
            aria-label="Akcje raportu pola"
            sx={{ gap: 1.25, flexWrap: 'wrap' }}
          >
            <Button
              variant="contained"
              startIcon={<PictureAsPdfIcon />}
              onClick={() => window.print()}
              sx={{ minHeight: 56, borderRadius: '12px' }}
            >
              Pobierz PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={() => window.print()}
              sx={{ minHeight: 56, borderRadius: '12px' }}
            >
              Drukuj
            </Button>
          </Stack>
        </Box>
        <Typography
          color="text.secondary"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px 16px',
            fontSize: { xs: '1.0625rem', md: '1.1875rem' },
          }}
        >
          <span>
            {report.parcels.length} działki · <b>{formatNumber(report.areaHa, 1)} ha</b>
          </span>
          <Box component="span" sx={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
            <GrassIcon aria-hidden sx={{ color: 'kropla.iconMuted' }} />
            <b>{report.crop.name}</b>
          </Box>
          <Box component="span" sx={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
            <EventIcon aria-hidden sx={{ color: 'kropla.iconMuted' }} />
            <b>Stan na {formatDate(report.analysisDate)}</b>
          </Box>
        </Typography>
        {failedCount > 0 && (
          <Alert severity="warning" icon={<ErrorOutlineIcon />} sx={{ fontSize: '1.125rem' }}>
            {failedCount === 1
              ? 'Jednej działki nie udało się policzyć.'
              : `${failedCount} działek nie udało się policzyć.`}{' '}
            Podsumowanie dotyczy pozostałych.
          </Alert>
        )}
      </Box>

      <SummaryCard report={report} />

      <SectionCard
        id="field-map"
        title="Mapa pola"
        subtitle="Każda działka ma kolor i podpis stanu."
      >
        <FieldMap shapes={shapes} />
        {isOutlineMissing && (
          <Alert severity="info">Nie wszystkie granice działek udało się pobrać na mapę.</Alert>
        )}
        <Legend />
      </SectionCard>

      <SectionCard
        id="field-parcels"
        title="Działki"
        subtitle="Najpierw raport każdej działki osobno."
      >
        <Box
          component="ul"
          sx={{
            display: 'grid',
            gap: 2,
            p: 0,
            m: 0,
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              md: 'repeat(auto-fill, minmax(280px, 1fr))',
            },
          }}
        >
          {report.parcels.map((parcel) => (
            <ParcelCard key={parcel.parcelId} parcel={parcel} />
          ))}
        </Box>
      </SectionCard>

      <SectionCard
        id="field-recommendations"
        title="Co zrobić"
        subtitle="Porady połączone dla całego pola, bez powtórzeń."
      >
        {report.recommendations.length === 0 ? (
          <Typography sx={{ fontSize: '1.125rem' }}>Brak porad dla tego pola.</Typography>
        ) : (
          <Box component="ul" sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 0, m: 0 }}>
            {report.recommendations.map((item) => (
              <Box
                component="li"
                key={item.ruleId}
                sx={{
                  listStyle: 'none',
                  border: 1,
                  borderColor: 'kropla.line',
                  borderRadius: '14px',
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.75,
                  breakInside: 'avoid',
                }}
              >
                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.secondary' }}>
                  {PRIORITY_WORD[item.priority]}
                </Typography>
                <Typography variant="h3" component="h3" sx={{ fontSize: '1.375rem' }}>
                  {item.title}
                </Typography>
                <Typography sx={{ fontSize: '1.125rem', maxWidth: '75ch' }}>
                  {item.action}
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: '1.0625rem', maxWidth: '75ch' }}>
                  {item.why}
                </Typography>
                {item.parcelIds && item.parcelIds.length > 0 && (
                  <Typography sx={{ fontSize: '1.125rem', fontWeight: 700 }}>
                    Dotyczy działek: {item.parcelIds.map(numberOf).join(', ')}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </SectionCard>

      <Box className="no-print">
        <Button variant="outlined" onClick={onNew} sx={{ minHeight: 56, fontSize: '1.125rem' }}>
          Policz inną uprawę lub dzień
        </Button>
      </Box>
    </Box>
  );
}

export function FieldReportPage() {
  const { fieldId = '' } = useParams<{ fieldId: string }>();
  const queryClient = useQueryClient();
  const crops = useCrops();
  const mutation = useCreateFieldReportMutation(fieldId);
  const cached = queryClient.getQueryData<FieldReport>([...FIELD_REPORTS_KEY, fieldId]);
  const report = mutation.data ?? cached;

  if (mutation.isPending) {
    return (
      <Stack
        spacing={2}
        role="status"
        aria-live="polite"
        sx={{ maxWidth: 720, mx: 'auto', py: { xs: 4, md: 8 } }}
      >
        <Typography variant="h1" component="h1">
          Liczymy działki pola…
        </Typography>
        <Typography sx={{ fontSize: '1.25rem' }}>
          Sprawdzamy wodę w glebie na każdej działce osobno. To może potrwać do minuty.
        </Typography>
        <LinearProgress sx={{ height: 10, borderRadius: 5 }} aria-label="Trwa liczenie" />
      </Stack>
    );
  }

  if (report) {
    return (
      <FieldResult
        report={report}
        onNew={() => {
          queryClient.removeQueries({ queryKey: [...FIELD_REPORTS_KEY, fieldId] });
          mutation.reset();
        }}
      />
    );
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 1100, mx: 'auto', width: '100%' }}>
      <Box>
        <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'primary.main' }}>
          RAPORT POLA
        </Typography>
        <Typography variant="h1" component="h1">
          Jaka uprawa na tym polu?
        </Typography>
      </Box>
      {mutation.isError && (
        <Alert severity="error" role="alert" sx={{ fontSize: '1.125rem' }}>
          {fieldReportErrorMessage(mutation.error)}
        </Alert>
      )}
      {crops.isLoading && (
        <Stack spacing={1.5} aria-busy="true" role="status" aria-label="Ładowanie upraw">
          <Skeleton variant="rounded" height={80} />
          <Skeleton variant="rounded" height={80} />
        </Stack>
      )}
      {crops.isError && (
        <Alert
          severity="error"
          role="alert"
          action={
            <Button color="inherit" onClick={() => crops.refetch()} sx={{ minHeight: 44 }}>
              Spróbuj ponownie
            </Button>
          }
        >
          Nie udało się pobrać listy upraw.
        </Alert>
      )}
      {crops.data && crops.data.items.length === 0 && (
        <Alert severity="info">Brak upraw do wyboru.</Alert>
      )}
      {crops.data && crops.data.items.length > 0 && (
        <AnalysisForm
          crops={crops.data.items}
          backTo="/konto"
          onSubmit={(values) => mutation.mutate(values)}
        />
      )}
    </Stack>
  );
}
