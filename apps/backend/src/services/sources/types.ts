// T-004 DM-011 Shared source types: SourceId, status, SourceResult (maps 1:1 to SourceStatus fields)
export const SOURCE_IDS = [
  'uldk',
  'meteo',
  'sentinel2',
  'nasa_power',
  'eumetsat',
  'soilgrids',
  'elevation',
  'overpass',
] as const;

export type SourceId = (typeof SOURCE_IDS)[number];

// Same values as DM-011 status enum.
export type SourceStatusValue = 'ok' | 'cached' | 'missing' | 'error' | 'timeout';

export type SourceResult<T> = {
  sourceId: SourceId;
  status: SourceStatusValue;
  data: T | null;
  message: string | null;
  fetchedAt: Date | null;
  dataPeriod: string | null;
  durationMs: number;
};
