// T-004 DM-011 Shared source types: SourceId, status, SourceResult (maps 1:1 to SourceStatus fields)
export const SOURCE_IDS = [
  'uldk',
  'meteo',
  'sentinel2',
  'era5land',
  'nasa_power',
  'eumetsat',
  'soilgrids',
  'elevation',
  'overpass',
] as const;

export type SourceId = (typeof SOURCE_IDS)[number];

// Same values as DM-011 status enum.
export type SourceStatusValue = 'ok' | 'cached' | 'missing' | 'error' | 'timeout';

// DM-011 role (ADR-009): current window, 10-year climatology, or fallback of the current window.
export type SourceRole = 'current' | 'climatology' | 'fallback';

// DM-011 reasonCode: machine-readable cause of a missing/error/timeout source.
export type ReasonCode =
  | 'NO_SCENE'
  | 'CLOUD_COVER'
  | 'PARCEL_TOO_SMALL'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'UPSTREAM_ERROR'
  | 'NOT_CONFIGURED';

export type SourceResult<T> = {
  sourceId: SourceId;
  role?: SourceRole;
  status: SourceStatusValue;
  data: T | null;
  message: string | null;
  reasonCode?: ReasonCode | null;
  fetchedAt: Date | null;
  dataPeriod: string | null;
  durationMs: number;
};
