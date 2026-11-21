// UI-C-006 AssessmentSection
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
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
import { KbwChart } from '@/components/KbwChart/KbwChart';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { formatDate, formatNumber, formatSigned } from '@/utils/format';
import { reasonText } from '@/utils/reasonCodes';

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

const SM_ASSESSMENT_LABEL = {
  dry: 'sucho',
  normal: 'w normie',
  wet: 'mokro',
  unknown: 'brak oceny',
} as const;

const AGREEMENT_LABEL = {
  confirms: 'potwierdza ocenę',
  contradicts: 'nie potwierdza oceny',
  neutral: 'neutralna',
} as const;

interface TileProps {
  title: string;
  children?: ReactNode;
  missing?: { reason: string; calm?: boolean };
}

function MetricTile({ title, children, missing }: TileProps) {
  return (
    <Card
      variant="outlined"
      component="article"
      sx={(theme) => ({
        height: '100%',
        ...(missing && {
          borderStyle: 'dashed',
          borderColor: theme.palette.drought.unknown,
          bgcolor: 'background.default',
          gridColumn: { lg: 'span 2' },
        }),
      })}
    >
      <CardContent>
        <Typography variant="h3" component="h3" sx={{ fontSize: '1rem', mb: 1 }}>
          {title}
        </Typography>
        {missing ? (
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <RemoveCircleOutlineIcon sx={{ color: 'drought.unknown' }} aria-hidden />
            <Stack spacing={0.5}>
              <Typography sx={{ fontWeight: 600 }} color="text.secondary">
                Brak danych
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {missing.reason}
              </Typography>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={0.5}>{children}</Stack>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ value, unit }: { value: string; unit?: string }) {
  return (
    <Typography variant="metric" component="p" sx={{ m: 0, minWidth: 0, overflowWrap: 'anywhere' }}>
      {value}
      {unit && (
        <Typography component="span" color="text.secondary" sx={{ ml: 0.5, fontSize: '1rem' }}>
          {unit}
        </Typography>
      )}
    </Typography>
  );
}

function Line({ children }: { children: ReactNode }) {
  return (
    <Typography variant="caption" color="text.secondary" component="p" sx={{ m: 0 }}>
      {children}
    </Typography>
  );
}

function KbwTile({
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
      <MetricTile
        title={title}
        missing={{ reason: gapReason(gap) ?? 'Brak danych pogodowych dla tego okresu.' }}
      />
    );
  }
  return (
    <MetricTile title={title}>
      <Metric value={formatNumber(window.kbwMm, 0)} unit="mm" />
      <Line>Norma: {formatNumber(window.normKbwMm, 0)} mm</Line>
      <Line>Odchylenie od normy: {formatSigned(window.anomalyMm, 0)} mm</Line>
      <Line>Percentyl: {formatNumber(window.percentile, 0)}</Line>
      <Line>Opad: {formatNumber(window.precipitationNormPct, 0)}% normy</Line>
      <Line>
        Okres: {formatDate(window.from)} do {formatDate(window.to)}
      </Line>
    </MetricTile>
  );
}

function IndexTile({
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
      <MetricTile
        title={title}
        missing={{
          // Scene exists but this one index is missing: say so instead of "no clear scene".
          // Backend adds a sentinel2 data gap with the reason (e.g. plan B: NDVI only); prefer it.
          reason: satellite
            ? `Wskaźnika ${kind.toUpperCase()} nie udało się policzyć dla zdjęcia z ${formatDate(satellite.sceneDate)}.${gap ? ` ${gapReason(gap)}` : ''}`
            : (gapReason(gap) ?? 'Brak bezchmurnego zdjęcia satelitarnego z ostatnich tygodni.'),
        }}
      />
    );
  }
  const assessment = kind === 'ndvi' ? satellite.ndviAssessment : satellite.ndmiAssessment;
  const min = kind === 'ndvi' ? satellite.expected.ndviMin : satellite.expected.ndmiMin;
  const max = kind === 'ndvi' ? satellite.expected.ndviMax : satellite.expected.ndmiMax;
  return (
    <MetricTile title={title}>
      <Metric value={formatNumber(value, 2)} />
      <Line>{INDEX_LABEL[assessment]}</Line>
      <Line>
        Oczekiwany zakres: {formatNumber(min, 2)} do {formatNumber(max, 2)}
      </Line>
      <Line>
        Zdjęcie z {formatDate(satellite.sceneDate)} ({satellite.ageDays} dni temu)
      </Line>
      <Line>
        Ważne piksele: {formatNumber(satellite.validPixelFraction * 100, 0)}% (
        {formatNumber(satellite.validPixels, 0)})
      </Line>
      <Line>
        Zawiera zmodyfikowane dane Copernicus Sentinel-2 ({satellite.sceneDate.slice(0, 4)})
      </Line>
    </MetricTile>
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
  const { soilWater, soilMoistureSatellite: sm, cropStage } = assessment;

  return (
    <Card
      component="section"
      id="stan-wody"
      aria-labelledby="stan-wody-title"
      sx={{ scrollMarginTop: 16 }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Typography id="stan-wody-title" variant="h2" component="h2">
            Stan wody na dzień {formatDate(analysisDate)}
          </Typography>
          <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
            <StatusBadge
              kind="drought"
              value={assessment.droughtClass}
              label={assessment.droughtClassLabel}
            />
            <StatusBadge kind="confidence" value={assessment.confidence} />
          </Stack>
          <Typography
            sx={{ fontSize: { xs: '1.125rem', lg: '1.5rem' }, fontWeight: 500, maxWidth: '75ch' }}
          >
            {assessment.summary}
          </Typography>
          {assessment.isOutOfSeason && (
            <Typography variant="caption" color="text.secondary">
              Uprawa ({cropName}) jest poza sezonem wegetacyjnym, ocena jest orientacyjna.
            </Typography>
          )}
          {assessment.confidenceReasons.length > 0 && (
            <Box component="details">
              <Typography component="summary" sx={{ cursor: 'pointer', minHeight: 44, py: 1 }}>
                Dlaczego taka pewność oceny
              </Typography>
              <Box component="ul" sx={{ mt: 0, pl: 3, maxWidth: '75ch' }}>
                {assessment.confidenceReasons.map((reason) => (
                  <Typography key={reason} component="li" variant="caption">
                    {reason}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}

          <Box
            className="metric-grid"
            sx={{
              display: 'grid',
              gap: 2,
              // lg (1280) has the 360 px map column beside it: 3 columns; 4 only on the projector (xl).
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
                xl: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            <KbwTile title="Bilans wodny, 30 dni" window={assessment.kbw30} gap={gapFor('meteo')} />
            <KbwTile title="Bilans wodny, 60 dni" window={assessment.kbw60} gap={gapFor('meteo')} />

            {soilWater ? (
              <MetricTile title="Woda w glebie">
                <Metric
                  value={
                    soilWater.depletionMm === null ? 'brak' : formatNumber(soilWater.depletionMm, 0)
                  }
                  unit={soilWater.depletionMm === null ? undefined : 'mm'}
                />
                <Line>Deficyt wody w glebie</Line>
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
              </MetricTile>
            ) : (
              <MetricTile
                title="Woda w glebie"
                missing={{
                  reason:
                    gapReason(gapFor('soilgrids')) ??
                    'Brak danych o glebie, nie policzono deficytu.',
                }}
              />
            )}

            <IndexTile
              title="Kondycja roślin (NDVI)"
              satellite={assessment.satellite}
              kind="ndvi"
              gap={gapFor('sentinel2')}
            />
            <IndexTile
              title="Wilgotność roślin (NDMI)"
              satellite={assessment.satellite}
              kind="ndmi"
              gap={gapFor('sentinel2')}
            />

            {sm ? (
              <MetricTile title={sm.label ?? 'Wilgotność gleby'}>
                {sm.valuePct != null ? (
                  <Metric value={formatNumber(sm.valuePct, 0)} unit="%" />
                ) : sm.percentile != null ? (
                  <Metric value={`percentyl ${formatNumber(sm.percentile, 0)}`} />
                ) : (
                  <Metric value={SM_ASSESSMENT_LABEL[sm.assessment]} />
                )}
                <Line>Warstwa: {sm.depthLabel}</Line>
                {sm.profilePct != null && (
                  <Line>Profil gleby: {formatNumber(sm.profilePct, 0)}%</Line>
                )}
                {sm.rootZonePct != null && (
                  <Line>Strefa korzeni: {formatNumber(sm.rootZonePct, 0)}%</Line>
                )}
                {sm.valuePct != null && sm.percentile != null && (
                  <Line>Percentyl 10 lat: {formatNumber(sm.percentile, 0)}</Line>
                )}
                <Line>Pomiar z {formatDate(sm.observedAt)}</Line>
                <Line>
                  {sm.fallback
                    ? `Dane zapasowe NASA POWER, siatka ok. ${formatNumber(sm.resolutionKm, 0)} km`
                    : `ERA5-Land (Copernicus), siatka ok. ${formatNumber(sm.resolutionKm, 0)} km`}
                </Line>
                <Line>Wynik {AGREEMENT_LABEL[sm.agreement]}</Line>
              </MetricTile>
            ) : (
              <MetricTile
                title="Wilgotność gleby"
                missing={{
                  calm: true,
                  reason:
                    gapReason(gapFor('era5land')) ??
                    gapReason(gapFor('nasa_power')) ??
                    'Ten pomiar jest dodatkowy, ocena opiera się na bilansie wodnym i glebie.',
                }}
              />
            )}

            <MetricTile title="Faza uprawy">
              <Typography variant="h3" component="p" sx={{ m: 0 }}>
                {cropStage.name}
              </Typography>
              <Line>Współczynnik uprawy Kc: {formatNumber(cropStage.kc, 2)}</Line>
              {cropStage.isCritical && <Line>Okres krytyczny dla wody</Line>}
            </MetricTile>
          </Box>

          <KbwChart charts={charts} />

          {assessment.evidence.length > 0 && (
            <Box component="details">
              <Typography component="summary" sx={{ cursor: 'pointer', minHeight: 44, py: 1 }}>
                Na czym opieramy ocenę
              </Typography>
              <Box component="ul" sx={{ mt: 0, pl: 3 }}>
                {assessment.evidence.map((item) => (
                  <Typography
                    key={`${item.label}-${item.dataDate}`}
                    component="li"
                    variant="caption"
                  >
                    {item.label}:{' '}
                    {typeof item.value === 'number'
                      ? formatNumber(item.value, 1)
                      : (item.value ?? 'brak')}
                    {item.unit ? ` ${item.unit}` : ''} (dane z {formatDate(item.dataDate)})
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
