// T-018 DM-011 sources[] built from runSource results + DM-001 report status rule
import { SOURCES } from '@/services/sources/catalog';
import type {
  ReasonCode,
  SourceId,
  SourceResult,
  SourceRole,
  SourceStatusValue,
} from '@/services/sources/types';

export type SourceStatus = {
  sourceId: SourceId;
  name: string;
  label: string;
  category: string;
  provider: string;
  url: string;
  license: string;
  attribution?: string;
  status: SourceStatusValue;
  dataPeriod: string | null;
  fetchedAt: Date | null;
  durationMs: number;
  message: string | null;
  reasonCode: ReasonCode | null;
  role: SourceRole | null;
};

// DM-001 note: eumetsat is optional, nasa_power is a fallback; neither affects the status.
const MANDATORY: SourceId[] = [
  'uldk',
  'meteo',
  'sentinel2',
  'era5land',
  'soilgrids',
  'elevation',
  'overpass',
];

// Catalog order; sources without a result are skipped.
export function buildSourceStatuses(results: SourceResult<unknown>[]): SourceStatus[] {
  const statuses: SourceStatus[] = [];
  for (const source of SOURCES) {
    const result = results.find((item) => item.sourceId === source.id);
    if (!result) continue;
    statuses.push({
      sourceId: source.id,
      name: source.name,
      label: source.label,
      category: source.category,
      provider: source.provider,
      url: source.url,
      license: source.license,
      ...(source.attribution ? { attribution: source.attribution } : {}),
      status: result.status,
      dataPeriod: result.dataPeriod,
      fetchedAt: result.fetchedAt,
      durationMs: result.durationMs,
      message: result.message,
      reasonCode: result.reasonCode ?? null,
      role: result.role ?? null,
    });
  }
  return statuses;
}

// Sources that nasa_power (role fallback, ok/cached) replaces when Open-Meteo fails (ADR-008, decision 13:42).
const COVERED_BY_NASA_FALLBACK: SourceId[] = ['meteo', 'era5land'];

const isOk = (item: SourceStatus) => item.status === 'ok' || item.status === 'cached';

export function reportStatus(statuses: SourceStatus[]): 'complete' | 'partial' {
  const nasaFallbackOk = statuses.some(
    (item) => item.sourceId === 'nasa_power' && item.role === 'fallback' && isOk(item),
  );
  const failed = statuses.some(
    (item) =>
      MANDATORY.includes(item.sourceId) &&
      !isOk(item) &&
      !(nasaFallbackOk && COVERED_BY_NASA_FALLBACK.includes(item.sourceId)),
  );
  return failed ? 'partial' : 'complete';
}
