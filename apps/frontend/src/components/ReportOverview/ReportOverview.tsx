// UI-S-003 ReportOverview: result card, "Sprawdź inną działkę" + map, soil water slider, top recommendation (design Kropla)
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Box, Button, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import type { Confidence, DroughtClass, Recommendation, Report } from '@/api/types';
import { AlertLabel } from '@/components/AlertLabel/AlertLabel';
import { Expandable } from '@/components/MoreButton/Expandable';
import { MoreButton } from '@/components/MoreButton/MoreButton';
import { ParcelMap } from '@/components/ParcelMap/ParcelMap';
import { getTodayIso } from '@/components/AnalysisForm/AnalysisForm.schema';
import { formatDate, formatNumber } from '@/utils/format';
import { soilWaterState } from '@/utils/reportState';
import { formatEvidence } from '@/utils/sourceLabels';

export interface ReportOverviewProps {
  report: Report;
}

const CONFIDENCE_TEXT: Record<Confidence, string> = {
  high: 'wysoka',
  medium: 'średnia',
  low: 'niska',
};

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

const DROUGHT_ICON: Record<DroughtClass, typeof ErrorOutlineIcon> = {
  severe: ErrorOutlineIcon,
  moderate: WarningAmberIcon,
  none: CheckCircleOutlineIcon,
  unknown: HelpOutlineIcon,
};

const cardBaseSx = {
  borderRadius: '18px',
  p: { xs: 2.25, md: 3.5 },
  display: 'flex',
  flexDirection: 'column',
  gap: 2.25,
  minWidth: 0,
} as const;

const plainCardSx = {
  ...cardBaseSx,
  bgcolor: 'background.paper',
  border: 1,
  borderColor: 'kropla.line',
};

function droughtColor(theme: Theme, value: DroughtClass): string {
  const { drought, kropla } = theme.palette;
  return value === 'severe' ? kropla.alertHigh : drought[value];
}

function topRecommendation(items: Recommendation[]): Recommendation | undefined {
  return [...items].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.order - b.order,
  )[0];
}

function ResultCard({ report }: ReportOverviewProps) {
  const { assessment, analysisDate, crop } = report;
  const droughtClass = assessment.droughtClass;
  const Icon = DROUGHT_ICON[droughtClass];
  const isSevere = droughtClass === 'severe';
  return (
    <Box
      component="section"
      aria-labelledby="wynik-title"
      sx={(theme) => {
        const color = droughtColor(theme, droughtClass);
        return {
          ...cardBaseSx,
          order: { xs: 1, md: 0 },
          bgcolor: isSevere ? theme.palette.kropla.severeBg : alpha(color, 0.08),
          border: `${isSevere ? 4 : 3}px solid ${color}`,
        };
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.75, md: 2.5 } }}>
          <Icon
            aria-hidden
            sx={(theme) => ({
              fontSize: { xs: 56, md: 72 },
              color: droughtColor(theme, droughtClass),
            })}
          />
          <Box>
            <Typography color="text.secondary" sx={{ fontSize: '1.125rem' }}>
              Wynik na {formatDate(analysisDate)}
            </Typography>
            <Typography
              id="wynik-title"
              variant="h2"
              component="h2"
              sx={{ fontSize: { xs: '1.875rem', md: '3rem' }, lineHeight: 1.1, fontWeight: 800 }}
            >
              {assessment.droughtClassLabel}
            </Typography>
          </Box>
        </Box>
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2.25,
            py: 1.25,
            borderRadius: 9999,
            border: 2,
            borderColor: 'kropla.iconMuted',
            bgcolor: 'background.paper',
            fontSize: '1.1875rem',
            fontWeight: 700,
          }}
        >
          <VerifiedOutlinedIcon aria-hidden color="primary" />
          Pewność: {CONFIDENCE_TEXT[assessment.confidence]}
        </Box>
      </Box>
      <Typography sx={{ fontSize: { xs: '1.1875rem', md: '1.5rem' }, lineHeight: 1.45 }}>
        {assessment.summary}
      </Typography>
      {assessment.isOutOfSeason && (
        <Typography color="text.secondary">
          Uprawa ({crop.name}) jest poza sezonem wegetacyjnym, ocena jest orientacyjna.
        </Typography>
      )}
      <Expandable
        sx={{ mt: 'auto', pt: 1 }}
        header={null}
        headerSx={{ display: 'flex' }}
        renderHeader={(open) => <MoreButton variant="red" size="large" open={open} />}
      >
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          {assessment.confidenceReasons.length > 0 && (
            <Box sx={{ bgcolor: 'background.paper', borderRadius: '12px', p: 2 }}>
              <Typography
                component="h3"
                sx={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', gap: 1 }}
              >
                <VerifiedOutlinedIcon aria-hidden color="primary" />
                Skąd wiemy, że pewność jest {CONFIDENCE_TEXT[assessment.confidence]}?
              </Typography>
              <Box component="ul" sx={{ m: 0, mt: 1, pl: 3 }}>
                {assessment.confidenceReasons.map((reason, index) => (
                  <Typography
                    key={`${reason}-${index}`}
                    component="li"
                    sx={{ fontSize: '1.0625rem' }}
                  >
                    {reason}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
          {assessment.evidence.length > 0 && (
            <Box>
              <Typography component="h3" sx={{ fontSize: '1.125rem', fontWeight: 700 }}>
                Na czym opieramy ocenę
              </Typography>
              <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 3 }}>
                {assessment.evidence.map((item, index) => (
                  <Typography
                    key={`${item.label}-${item.dataDate}-${index}`}
                    component="li"
                    sx={{ fontSize: '1rem' }}
                  >
                    {formatEvidence(item)}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Expandable>
    </Box>
  );
}

function ParcelColumn({ report }: ReportOverviewProps) {
  const { parcel, recommendations } = report;
  return (
    <Box
      sx={{
        order: { xs: 4, md: 0 },
        display: 'flex',
        flexDirection: 'column',
        gap: 1.75,
        minWidth: 0,
      }}
    >
      <Button
        component={RouterLink}
        to="/"
        variant="outlined"
        className="no-print"
        startIcon={<SearchIcon />}
        sx={(theme) => ({
          minHeight: 68,
          borderRadius: '14px',
          borderColor: theme.palette.kropla.iconMuted,
          color: 'text.primary',
          fontSize: '1.3125rem',
          bgcolor: 'background.paper',
          '&:hover': {
            bgcolor: 'primary.main',
            borderColor: 'primary.main',
            color: theme.palette.common.white,
          },
        })}
      >
        Sprawdź inną działkę
      </Button>
      <Box
        component="section"
        aria-label="Mapa działki"
        sx={{
          flex: '1 1 auto',
          border: 1,
          borderColor: 'kropla.line',
          borderRadius: '18px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ flex: '1 1 auto', minHeight: { xs: 260, md: 220 }, position: 'relative' }}>
          <Box sx={{ position: 'absolute', inset: 0 }}>
            <ParcelMap
              parcel={parcel}
              isInteractive={false}
              markers={recommendations.flatMap((r) =>
                r.location ? [{ lat: r.location.lat, lon: r.location.lon, label: r.title }] : [],
              )}
              height="100%"
            />
          </Box>
        </Box>
        <Typography sx={{ px: 2.25, py: 1.75, fontSize: '1.0625rem', fontWeight: 600 }}>
          Twoja działka · {formatNumber(parcel.areaHa, 1)} ha
        </Typography>
      </Box>
    </Box>
  );
}

function SoilWaterCard({ report }: ReportOverviewProps) {
  const { soilWater } = report.assessment;
  // T-109 the report may be for a past day: say "was" with the date, "is today" only for today
  const isToday = report.analysisDate.slice(0, 10) === getTodayIso();
  const state = soilWater
    ? soilWaterState(soilWater.depletionMm, soilWater.tawMm, soilWater.rawMm)
    : null;
  const depletion = soilWater?.depletionMm ?? null;
  const hasDeficit = depletion !== null && depletion > 0;
  return (
    <Box
      component="section"
      aria-labelledby="gleba-title"
      sx={{ ...plainCardSx, order: { xs: 2, md: 0 } }}
    >
      <Typography
        id="gleba-title"
        variant="h3"
        component="h2"
        sx={{ fontSize: { xs: '1.375rem', md: '1.625rem' }, fontWeight: 800 }}
      >
        {isToday
          ? 'Ile wody jest dziś w glebie?'
          : `Ile wody było w glebie ${formatDate(report.analysisDate)}?`}
      </Typography>
      {!soilWater || !state ? (
        <>
          <Typography
            component="span"
            sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, lineHeight: 1.1, fontWeight: 800 }}
          >
            Brak danych
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '1.125rem' }}>
            Nie mamy danych o glebie tej działki, więc nie policzyliśmy, ile wody brakuje.
          </Typography>
        </>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.75, flexWrap: 'wrap' }}>
            <Typography
              component="span"
              sx={{
                fontSize: { xs: '2.5rem', md: '4rem' },
                lineHeight: 1,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {depletion === null
                ? 'Brak danych'
                : `${hasDeficit ? '−' : ''}${formatNumber(Math.abs(depletion), 0)} mm`}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: { xs: '1rem', md: '1.375rem' } }}>
              {hasDeficit ? 'brakuje wody w glebie' : 'deficyt wody w glebie'}
            </Typography>
          </Box>
          <Box
            role="img"
            aria-label={`Wilgotność gleby: ${state.label}`}
            sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 0.75 }}
          >
            <Box
              sx={{
                position: 'relative',
                height: { xs: 18, md: 22 },
                borderRadius: 9999,
                background: (theme) => theme.palette.kropla.sliderGradient,
              }}
            >
              <Box
                component="span"
                sx={(theme) => ({
                  position: 'absolute',
                  left: `${state.position}%`,
                  top: '50%',
                  width: 36,
                  height: 36,
                  ml: '-18px',
                  mt: '-18px',
                  boxSizing: 'border-box',
                  borderRadius: 9999,
                  bgcolor: stateColor(theme, state.level),
                  border: `4px solid ${theme.palette.common.white}`,
                  boxShadow: `0 0 0 2px ${theme.palette.text.primary}`,
                })}
              />
            </Box>
            <Box
              aria-hidden
              sx={{ position: 'relative', height: 24, fontSize: '1rem', color: 'text.secondary' }}
            >
              <span style={{ position: 'absolute', left: 0 }}>Sucho</span>
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  left: '50%',
                  width: '30%',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  fontWeight: 700,
                  color: 'drought.none',
                }}
              >
                W normie
              </Box>
              <span style={{ position: 'absolute', right: 0 }}>Mokro</span>
            </Box>
          </Box>
          <Box sx={{ alignSelf: { xs: 'flex-start', md: 'flex-end' }, mt: 'auto' }}>
            <AlertLabel level={state.level} label={state.label} size="large" />
          </Box>
        </>
      )}
    </Box>
  );
}

function stateColor(theme: Theme, level: string): string {
  const { kropla, drought, primary } = theme.palette;
  const colors: Record<string, string> = {
    high: kropla.alertHigh,
    medium: kropla.alertMedium,
    low: kropla.alertLow,
    ok: drought.none,
    wet: primary.main,
  };
  return colors[level] ?? drought.unknown;
}

function Line({ children }: { children: ReactNode }) {
  return <Typography sx={{ fontSize: '1.125rem', lineHeight: 1.45 }}>{children}</Typography>;
}

function NowCard({ report }: ReportOverviewProps) {
  const top = topRecommendation(report.recommendations);
  const irrigation = top?.irrigation;
  return (
    <Box
      component="section"
      aria-labelledby="teraz-title"
      sx={(theme) => ({
        ...cardBaseSx,
        order: { xs: 3, md: 0 },
        bgcolor: theme.palette.kropla.tint,
        border: `3px solid ${theme.palette.secondary.main}`,
        p: { xs: 2.25, md: 3 },
      })}
    >
      <Typography
        id="teraz-title"
        variant="h3"
        component="h2"
        sx={{ fontSize: { xs: '1.375rem', md: '1.625rem' }, fontWeight: 800 }}
      >
        Najważniejsze teraz
      </Typography>
      {!top ? (
        <Typography color="text.secondary">Za mało danych, by bezpiecznie doradzić.</Typography>
      ) : (
        <>
          <Typography
            component="h3"
            sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' }, fontWeight: 700, lineHeight: 1.3 }}
          >
            {top.title}
          </Typography>
          <Line>{top.action}</Line>
          {top.when && <Line>Kiedy: {top.when}</Line>}
          {irrigation?.isJustified && irrigation.netDoseMm !== null && (
            <Line>
              Dawka: <b>{formatNumber(irrigation.netDoseMm, 0)} mm</b>
              {irrigation.grossDoseMm !== null &&
                ` netto, ${formatNumber(irrigation.grossDoseMm, 0)} mm brutto`}
              {irrigation.window ? ` · okno: ${irrigation.window}` : ''}
            </Line>
          )}
          <Button
            href="#co-zrobic"
            className="no-print"
            sx={{ alignSelf: 'flex-start', minHeight: 56, mt: 'auto' }}
          >
            Zobacz wszystkie porady
          </Button>
        </>
      )}
    </Box>
  );
}

export function ReportOverview({ report }: ReportOverviewProps) {
  return (
    <Box
      className="report-overview"
      sx={{
        display: 'grid',
        gap: { xs: 2, md: 3 },
        alignItems: 'stretch',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 3fr) minmax(0, 2fr)' },
      }}
    >
      <ResultCard report={report} />
      <ParcelColumn report={report} />
      <SoilWaterCard report={report} />
      <NowCard report={report} />
    </Box>
  );
}
