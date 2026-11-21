// UI-C-006 AssessmentSection: "Liczby w skrócie" (metric cards) and the KBW chart
import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import type {
  Assessment,
  DataGap,
  IndexAssessment,
  Report,
  SatelliteObservation,
  SourceId,
  WaterBalanceWindow,
} from '@/api/types';
import { CardGrid } from '@/components/CardGrid/CardGrid';
import { KbwChart } from '@/components/KbwChart/KbwChart';
import { MetricCard } from '@/components/MetricCard/MetricCard';
import { SectionCard } from '@/components/SectionCard/SectionCard';
import { formatDate, formatNumber, formatSigned } from '@/utils/format';
import { reasonText } from '@/utils/reasonCodes';
import {
  ALERT_TEXT,
  indexAlert,
  kbwAlert,
  soilMoistureAlert,
  soilWaterState,
} from '@/utils/reportState';
import type { AlertLevel } from '@/utils/reportState';

function gapReason(gap: DataGap | undefined): string | undefined {
  return gap ? reasonText(gap.reasonCode, gap.impact) : undefined;
}

interface AssessmentSectionProps {
  assessment: Assessment;
  cropName: string;
  analysisDate: string;
  dataGaps: DataGap[];
  /** UI-C-011 KbwChart data (frontend-1); null shows the chart's own "no data" message */
  charts: Report['charts'];
}

const INDEX_LABEL: Record<IndexAssessment, string> = {
  below: 'poniżej normy dla uprawy',
  normal: 'w normie dla uprawy',
  above: 'powyżej normy dla uprawy',
  unknown: 'ocena niemożliwa',
};

const INDEX_ALERT_TEXT: Record<IndexAssessment, string> = {
  below: 'Poniżej normy',
  normal: 'W normie',
  above: 'Powyżej normy',
  unknown: 'Brak oceny',
};

const SM_ASSESSMENT_LABEL = {
  dry: 'sucho',
  normal: 'w normie',
  wet: 'mokro',
  unknown: 'brak oceny',
} as const;

const SM_ALERT_TEXT = {
  dry: 'Sucho',
  normal: 'W normie',
  wet: 'Mokro',
  unknown: 'Brak oceny',
} as const;

const AGREEMENT_LABEL = {
  confirms: 'potwierdza ocenę',
  contradicts: 'nie potwierdza oceny',
  neutral: 'neutralna',
} as const;

function Line({ children }: { children: ReactNode }) {
  return (
    <Typography component="p" sx={{ m: 0, fontSize: '1.0625rem', lineHeight: 1.45 }}>
      {children}
    </Typography>
  );
}

function alertOf(level: AlertLevel, label: string) {
  return { level, label };
}

function KbwCard({
  title,
  window,
  gap,
}: {
  title: string;
  window: WaterBalanceWindow | null;
  gap?: DataGap;
}) {
  if (!window) {
    return (
      <MetricCard
        title={title}
        missingReason={gapReason(gap) ?? 'Brak danych pogodowych dla tego okresu.'}
      />
    );
  }
  const level = kbwAlert(window.percentile);
  const isWorse = window.anomalyMm < 0;
  return (
    <MetricCard
      title={title}
      value={`${formatSigned(window.kbwMm, 0)} mm`}
      caption={window.kbwMm < 0 ? 'tyle wody brakuje' : 'nadwyżka wody'}
      period={`${formatDate(window.from)} – ${formatDate(window.to)}`}
      alert={alertOf(level, ALERT_TEXT[level])}
    >
      <Line>
        Teraz <b>{formatSigned(window.kbwMm, 0)} mm</b>, zwykle{' '}
        <b>{formatSigned(window.normKbwMm, 0)} mm</b>
        {window.anomalyMm === 0
          ? ' – tyle co zwykle.'
          : ` – jest ${isWorse ? 'gorzej' : 'lepiej'} o ${formatNumber(Math.abs(window.anomalyMm), 0)} mm.`}
      </Line>
      <Line>Percentyl: {formatNumber(window.percentile, 0)}</Line>
      <Line>Opad: {formatNumber(window.precipitationNormPct, 0)}% normy</Line>
      <Line>
        Średnia temperatura maks.: {formatNumber(window.meanTmaxC, 1)} °C (norma{' '}
        {formatNumber(window.normTmaxC, 1)} °C)
      </Line>
    </MetricCard>
  );
}

function IndexCard({
  title,
  satellite,
  kind,
  gap,
}: {
  title: string;
  satellite: SatelliteObservation | null;
  kind: 'ndvi' | 'ndmi';
  gap?: DataGap;
}) {
  const value = satellite?.[kind] ?? null;
  if (!satellite || value === null) {
    return (
      <MetricCard
        title={title}
        missingReason={
          // Scene exists but this one index is missing: say so instead of "no clear scene".
          // Backend adds a sentinel2 data gap with the reason (e.g. plan B: NDVI only); prefer it.
          satellite
            ? `Wskaźnika ${kind.toUpperCase()} nie udało się policzyć dla zdjęcia z ${formatDate(satellite.sceneDate)}.${gap ? ` ${gapReason(gap)}` : ''}`
            : (gapReason(gap) ?? 'Brak bezchmurnego zdjęcia satelitarnego z ostatnich tygodni.')
        }
      />
    );
  }
  const assessment = kind === 'ndvi' ? satellite.ndviAssessment : satellite.ndmiAssessment;
  const min = kind === 'ndvi' ? satellite.expected.ndviMin : satellite.expected.ndmiMin;
  const max = kind === 'ndvi' ? satellite.expected.ndviMax : satellite.expected.ndmiMax;
  return (
    <MetricCard
      title={title}
      value={formatNumber(value, 2)}
      caption={INDEX_LABEL[assessment]}
      period={`Zdjęcie z ${formatDate(satellite.sceneDate)} (${satellite.ageDays} dni temu)`}
      alert={alertOf(indexAlert(assessment), INDEX_ALERT_TEXT[assessment])}
    >
      <Line>
        Oczekiwany zakres: {formatNumber(min, 2)} do {formatNumber(max, 2)}
      </Line>
      <Line>
        Ważne piksele: {formatNumber(satellite.validPixelFraction * 100, 0)}% (
        {formatNumber(satellite.validPixels, 0)})
      </Line>
    </MetricCard>
  );
}

function SoilWaterCard({ assessment, gap }: { assessment: Assessment; gap?: DataGap }) {
  const { soilWater } = assessment;
  if (!soilWater) {
    return (
      <MetricCard
        title="Woda w glebie"
        missingReason={gapReason(gap) ?? 'Brak danych o glebie, nie policzono deficytu.'}
      />
    );
  }
  const state = soilWaterState(soilWater.depletionMm, soilWater.tawMm, soilWater.rawMm);
  const depletion = soilWater.depletionMm ?? 0;
  const hasValue = soilWater.depletionMm !== null;
  return (
    <MetricCard
      title="Woda w glebie"
      value={
        hasValue ? `${depletion > 0 ? '−' : ''}${formatNumber(Math.abs(depletion), 0)} mm` : 'brak'
      }
      caption="deficyt wody w glebie"
      alert={alertOf(state.level === 'wet' ? 'ok' : state.level, state.label)}
    >
      <Line>
        Dostępna dla roślin: {formatNumber(soilWater.tawMm, 0)} mm, łatwo dostępna:{' '}
        {formatNumber(soilWater.rawMm, 0)} mm
      </Line>
      <Line>
        {soilWater.isStressed === null
          ? 'Stres wodny: nie udało się ocenić'
          : soilWater.isStressed
            ? 'Roślina w stresie wodnym'
            : 'Roślina bez stresu wodnego'}
      </Line>
    </MetricCard>
  );
}

function SoilMoistureCard({ assessment, gaps }: { assessment: Assessment; gaps: DataGap[] }) {
  const sm = assessment.soilMoistureSatellite;
  const gapFor = (sourceId: SourceId) => gaps.find((gap) => gap.sourceId === sourceId);
  if (!sm) {
    return (
      <MetricCard
        title="Wilgotność gleby"
        missingReason={
          gapReason(gapFor('era5land')) ??
          gapReason(gapFor('nasa_power')) ??
          'Ten pomiar jest dodatkowy, ocena opiera się na bilansie wodnym i glebie.'
        }
      />
    );
  }
  const value =
    sm.valuePct != null
      ? `${formatNumber(sm.valuePct, 0)}%`
      : sm.percentile != null
        ? `percentyl ${formatNumber(sm.percentile, 0)}`
        : SM_ASSESSMENT_LABEL[sm.assessment];
  return (
    <MetricCard
      title={sm.label ?? 'Wilgotność gleby'}
      value={value}
      caption={`warstwa: ${sm.depthLabel}`}
      period={`Pomiar z ${formatDate(sm.observedAt)}`}
      alert={alertOf(soilMoistureAlert(sm.assessment), SM_ALERT_TEXT[sm.assessment])}
    >
      {sm.profilePct != null && <Line>Profil gleby: {formatNumber(sm.profilePct, 0)}%</Line>}
      {sm.rootZonePct != null && <Line>Strefa korzeni: {formatNumber(sm.rootZonePct, 0)}%</Line>}
      {sm.valuePct != null && sm.percentile != null && (
        <Line>Percentyl 10 lat: {formatNumber(sm.percentile, 0)}</Line>
      )}
      <Line>
        {sm.fallback
          ? `Dane zapasowe NASA POWER, siatka ok. ${formatNumber(sm.resolutionKm, 0)} km`
          : `ERA5-Land (Copernicus), siatka ok. ${formatNumber(sm.resolutionKm, 0)} km`}
      </Line>
      <Line>Wynik {AGREEMENT_LABEL[sm.agreement]}</Line>
    </MetricCard>
  );
}

export function AssessmentSection({
  assessment,
  cropName,
  analysisDate,
  dataGaps,
  charts,
}: AssessmentSectionProps) {
  const gapFor = (sourceId: SourceId) => dataGaps.find((gap) => gap.sourceId === sourceId);
  const { cropStage, satellite } = assessment;

  return (
    <SectionCard
      id="stan-wody"
      title="Liczby w skrócie"
      subtitle={`Stan na ${formatDate(analysisDate)}`}
    >
      <CardGrid
        footer={
          <MetricCard
            title="Faza uprawy"
            value={cropStage.name}
            caption={`${cropName} · współczynnik uprawy Kc: ${formatNumber(cropStage.kc, 2)}`}
            alert={cropStage.isCritical ? alertOf('low', 'Okres krytyczny dla wody') : undefined}
          />
        }
      >
        <KbwCard title="Ostatnie 30 dni" window={assessment.kbw30} gap={gapFor('meteo')} />
        <KbwCard title="Ostatnie 60 dni" window={assessment.kbw60} gap={gapFor('meteo')} />
        <SoilWaterCard assessment={assessment} gap={gapFor('soilgrids')} />
        <IndexCard
          title="Kondycja roślin (NDVI)"
          satellite={satellite}
          kind="ndvi"
          gap={gapFor('sentinel2')}
        />
        <IndexCard
          title="Wilgotność roślin (NDMI)"
          satellite={satellite}
          kind="ndmi"
          gap={gapFor('sentinel2')}
        />
        <SoilMoistureCard assessment={assessment} gaps={dataGaps} />
      </CardGrid>
      {satellite && (
        <Typography variant="caption" color="text.secondary">
          Zawiera zmodyfikowane dane Copernicus Sentinel-2 ({satellite.sceneDate.slice(0, 4)}).
        </Typography>
      )}
      <Box
        sx={{
          border: 1,
          borderColor: 'kropla.line',
          borderRadius: '16px',
          p: { xs: 2, md: 2.5 },
          minWidth: 0,
        }}
      >
        <Typography component="h4" sx={{ fontSize: '1.1875rem', fontWeight: 700, mb: 1.5 }}>
          Bilans wody na wykresie
        </Typography>
        <KbwChart charts={charts} />
      </Box>
    </SectionCard>
  );
}
