// T-017 API-004 analyses.service tests: mocked sources and storage (no network, no Atlas)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { test } from 'vitest';

import { createAnalysis, defaultAnalysesDeps } from '@/services/analyses.service';
import type { AnalysesDeps, ReportDto } from '@/services/analyses.service';
import type { SatelliteObservation } from '@/services/engine/satellite';
import type { SoilLayer } from '@/services/engine/soil';
import type { CachedEntry, SourceCacheStore } from '@/services/sources/cache.service';
import type { ElevationData } from '@/services/sources/elevation.source';
import type { HydroData } from '@/services/sources/overpass.source';
import { fetchMeteo, parseOpenMeteoResponse } from '@/services/sources/meteo.source';
import type { parsePowerResponse } from '@/services/sources/nasaPower.source';
import type { SourceId, SourceResult } from '@/services/sources/types';
import { parseUldkResponse } from '@/services/sources/uldk.source';
import type { ParcelData } from '@/services/sources/uldk.source';
import { AppError } from '@/utils/AppError';

const FIXTURES = resolve(process.cwd(), 'src/services/sources/__fixtures__');
const OPEN_METEO = JSON.parse(
  readFileSync(resolve(FIXTURES, 'open-meteo-synthetic-51.44-21.93.json'), 'utf8'),
) as Parameters<typeof parseOpenMeteoResponse>[0];
const NASA = JSON.parse(
  readFileSync(resolve(FIXTURES, 'nasa-power-51.44-21.93.json'), 'utf8'),
) as Parameters<typeof parsePowerResponse>[0];
const PARCEL = parseUldkResponse(
  readFileSync(resolve(FIXTURES, 'uldk-061409_2.0009.612.txt'), 'utf8'),
) as ParcelData;

const BODY = {
  parcelId: '061409_2.0009.612',
  cropCode: 'winter_wheat',
  analysisDate: '2026-06-10',
} as const;
const SAVED_ID = '6740a1f3c2e4b5a1d8f90a11';
const SOIL_LAYERS: SoilLayer[] = [
  { topCm: 0, bottomCm: 30, sandPct: 60, clayPct: 13, socPct: 1.1 },
  { topCm: 30, bottomCm: 100, sandPct: 60, clayPct: 13, socPct: 0.8 },
];
const ELEVATION: ElevationData = {
  minM: 180,
  maxM: 186,
  meanM: 183,
  elevationDiffM: 6,
  slopePct: 4,
  aspect: 'południe',
  lowestPoint: { lat: 51.43, lon: 21.92 },
};
const HYDRO: HydroData = {
  radiusM: 1000,
  counts: {
    river: 0,
    stream: 1,
    canal: 0,
    ditch: 1,
    drain: 0,
    water: 0,
    reservoir: 0,
    wetland: 0,
  },
  nearestDitchDistanceM: 812,
  nearestDitchPoint: { lat: 51.44, lon: 21.93 },
  nearestDitchType: 'stream',
  nearestWatercourseName: 'Klikawka',
  nearestReservoirDistanceM: null,
  hasReservoirWithin1km: false,
  hasWetlandWithin1km: false,
};
const EXAMPLE_KEYS = [
  'accountId',
  'analysisDate',
  'assessment',
  'causes',
  'charts',
  'computedAt',
  'createdAt',
  'crop',
  'dataGaps',
  'durationMs',
  'id',
  'limitations',
  'methodologyVersion',
  'parcel',
  'recommendations',
  'sources',
  'status',
  'vulnerability',
];

function memoryCache(): SourceCacheStore {
  const store = new Map<string, CachedEntry>();
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, _sourceId, payload, _ttlMs, dataPeriod) => {
      store.set(key, { payload, dataPeriod, fetchedAt: new Date() });
    },
  };
}

// Stub of Open-Meteo archive and NASA POWER HTTP APIs, backed by the fixtures.
function stubFetch(archiveStatus: number, nasaOk: boolean, nasaFailFirst = 0): typeof fetch {
  let nasaCalls = 0;
  return (async (url: string) => {
    if (url.includes('power.larc.nasa.gov')) {
      nasaCalls += 1;
      if (nasaCalls <= nasaFailFirst) return { ok: false, status: 503 };
      return nasaOk
        ? { ok: true, status: 200, json: async () => NASA }
        : { ok: false, status: 503 };
    }
    if (archiveStatus !== 200) return { ok: false, status: archiveStatus };
    return { ok: true, status: 200, json: async () => OPEN_METEO };
  }) as unknown as typeof fetch;
}

const SATELLITE: SatelliteObservation = {
  sceneId: 'S2B_34UDD_20250714_0_L2A',
  sceneDate: '2025-07-14',
  ageDays: 1,
  validPixelFraction: 0.97,
  validPixels: 120,
  ndvi: 0.62,
  ndmi: 0.08,
  thumbnailUrl: null,
  ndviAssessment: 'normal',
  ndmiAssessment: 'normal',
  expected: { ndviMin: 0.5, ndviMax: 0.8, ndmiMin: 0.15, ndmiMax: 0.4 },
};

function okSource(sourceId: SourceId, data: unknown = null) {
  return async (): Promise<SourceResult<unknown>> => ({
    sourceId,
    status: 'ok',
    data,
    message: null,
    fetchedAt: new Date(),
    dataPeriod: null,
    durationMs: 5,
  });
}

function parcelResult(status: 'ok' | 'missing' | 'error' | 'timeout'): SourceResult<ParcelData> {
  return {
    sourceId: 'uldk',
    status,
    data: status === 'ok' ? PARCEL : null,
    message: null,
    fetchedAt: new Date(),
    dataPeriod: null,
    durationMs: 3,
  };
}

function makeDeps(
  options: {
    archiveStatus?: number;
    nasaOk?: boolean;
    nasaFailFirst?: number;
    parcel?: 'ok' | 'missing' | 'error' | 'timeout';
  } = {},
) {
  const saved: unknown[] = [];
  const fetchFn = stubFetch(
    options.archiveStatus ?? 200,
    options.nasaOk ?? true,
    options.nasaFailFirst ?? 0,
  );
  const cache = memoryCache();
  const deps: AnalysesDeps = {
    fetchParcel: async () => parcelResult(options.parcel ?? 'ok'),
    fetchMeteo: (lat, lon, date, signal) => fetchMeteo(lat, lon, date, signal, { cache, fetchFn }),
    fetchers: {
      sentinel2: okSource('sentinel2', SATELLITE),
      soilgrids: okSource('soilgrids', SOIL_LAYERS),
      elevation: okSource('elevation', ELEVATION),
      overpass: okSource('overpass', HYDRO),
    },
    saveReport: async (report) => {
      saved.push(report);
      return SAVED_ID;
    },
    now: () => new Date(),
    budgetMs: 25000,
  };
  return { deps, saved };
}

async function expectAppError(promise: Promise<unknown>, code: string, status: number) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  });
}

function gapIds(report: ReportDto): string[] {
  return report.dataGaps.map((gap) => gap.sourceId);
}

test('all sources ok: complete report with the shape of the API-004 example', async () => {
  const { deps, saved } = makeDeps();
  const report = await createAnalysis(BODY, deps);

  assert.deepEqual(Object.keys(report).sort(), EXAMPLE_KEYS);
  assert.equal(report.id, SAVED_ID);
  assert.equal(report.status, 'complete');
  assert.equal(report.crop.code, 'winter_wheat');
  assert.equal(report.parcel.id, BODY.parcelId);
  assert.equal(report.methodologyVersion, 'kropla-1.0');
  assert.ok(report.charts);
  assert.equal(report.sources.length, 9);
  assert.ok(!Number.isNaN(Date.parse(report.computedAt)));

  const { assessment } = report;
  assert.ok(['none', 'moderate', 'severe'].includes(assessment.droughtClass));
  assert.ok(['high', 'medium', 'low'].includes(assessment.confidence));
  assert.ok(assessment.kbw60 && typeof assessment.kbw60.percentile === 'number');
  assert.ok(assessment.kbw30 && typeof assessment.kbw30.normKbwMm === 'number');
  assert.ok(assessment.soilWater && assessment.soilWater.tawMm > 0);
  assert.equal(assessment.soilMoistureSatellite?.fallback, false);
  assert.ok(assessment.summary.includes('percentyl'));
  assert.ok(report.vulnerability.yearsAnalyzed >= 8); // fixture starts in 2016-03
  assert.ok(report.recommendations.length > 0);
  assert.ok(report.limitations.some((text) => text.includes('NASA POWER')));
  assert.equal(saved.length, 1);
});

test('eumetsat is always missing but does not make the report partial', async () => {
  const { deps } = makeDeps();
  const report = await createAnalysis(BODY, deps);
  const eumetsat = report.sources.find((source) => source.sourceId === 'eumetsat');
  assert.equal(eumetsat?.status, 'missing');
  assert.equal(report.status, 'complete');
  assert.deepEqual(gapIds(report), ['eumetsat']);
});

test('Open-Meteo 503 with working NASA fallback: not partial, data gap, replaced message, lower confidence', async () => {
  const complete = await createAnalysis(BODY, makeDeps().deps);
  const { deps, saved } = makeDeps({ archiveStatus: 503 });
  const report = await createAnalysis(BODY, deps);

  // Coordinator decision 13:42: nasa_power (role fallback, ok) covers meteo and era5land.
  assert.equal(report.status, complete.status);
  assert.ok(gapIds(report).includes('meteo'));
  assert.equal(report.sources.find((s) => s.sourceId === 'meteo')?.status, 'error');
  assert.match(report.sources.find((s) => s.sourceId === 'meteo')?.message ?? '', /nasa_power/);
  assert.equal(report.sources.find((s) => s.sourceId === 'nasa_power')?.role, 'fallback');
  assert.equal(report.assessment.soilMoistureSatellite?.fallback, true);
  // Fallback penalty is applied (ADR-008); T-055: with NASA fallback the Dr > RAW rule gives at most moderate,
  // so the class can differ from the ERA5 run (and with it the NDMI agreement), hence no strict score comparison.
  assert.ok(report.assessment.confidenceReasons.some((reason) => /zapasowego/.test(reason)));
  assert.equal(complete.assessment.droughtClass, 'severe');
  assert.equal(report.assessment.droughtClass, 'moderate');
  assert.ok(report.assessment.kbw60);
  assert.equal(saved.length, 1);
});

test('T-067: Open-Meteo 429 and first NASA attempt 503 -> NASA retry succeeds -> 201 with weather', async () => {
  const { deps } = makeDeps({ archiveStatus: 429, nasaFailFirst: 1 });
  const report = await createAnalysis(BODY, deps);

  assert.equal(report.sources.find((s) => s.sourceId === 'nasa_power')?.status, 'ok');
  assert.equal(report.sources.find((s) => s.sourceId === 'meteo')?.reasonCode, 'RATE_LIMIT');
  assert.ok(report.assessment.kbw60, 'weather from the NASA retry');
  assert.notEqual(report.assessment.droughtClass, 'unknown');
});

test('NASA POWER failing: no percentile, class unknown, data gap, report still returned', async () => {
  const { deps } = makeDeps({ nasaOk: false });
  const report = await createAnalysis(BODY, deps);

  assert.equal(report.status, 'partial');
  assert.equal(report.assessment.kbw60, null);
  assert.equal(report.vulnerability.vulnerabilityClass, 'unknown');
  assert.ok(gapIds(report).includes('nasa_power'));
  // Current values go to evidence (the synthetic Open-Meteo fixture has 32 days, enough for 30).
  assert.ok(report.assessment.evidence.some((item) => item.label === 'KBW 30 dni'));
});

test('charts: about 90 KBW60 points and a climatology band on the same dates', async () => {
  const report = await createAnalysis(BODY, makeDeps().deps);
  const charts = report.charts;
  assert.ok(charts);

  assert.ok(charts.kbw60Series.length >= 85 && charts.kbw60Series.length <= 90);
  assert.ok(charts.kbw60Climatology.length >= 80);
  const seriesDates = new Set(charts.kbw60Series.map((point) => point.date));
  assert.ok(charts.kbw60Climatology.every((point) => seriesDates.has(point.date)));
  assert.equal(charts.kbw60Series.at(-1)?.date, BODY.analysisDate);
  assert.ok(charts.kbw60Climatology.every((p) => p.p10 <= p.p50 && p.p50 <= p.p90));
});

test('charts without NASA POWER: series only, empty band, report still returned', async () => {
  const report = await createAnalysis(BODY, makeDeps({ nasaOk: false }).deps);
  assert.ok(report.charts);
  assert.deepEqual(report.charts.kbw60Climatology, []);
  // Only the 32 days of the synthetic Open-Meteo fixture: no complete 60-day window.
  assert.equal(report.charts.kbw60Series.length, 0);
});

test('sources still in preparation count as missing (partial) with a clear message', async () => {
  const { deps } = makeDeps();
  deps.fetchers = {};
  const report = await createAnalysis(BODY, deps);
  const soilgrids = report.sources.find((source) => source.sourceId === 'soilgrids');
  assert.equal(report.status, 'partial');
  assert.equal(soilgrids?.status, 'missing');
  assert.equal(soilgrids?.message, 'Źródło w przygotowaniu');
  assert.ok(gapIds(report).includes('soilgrids'));
});

test('soil and terrain feed the report: soilWater, vulnerability.soil, terrain rules and causes', async () => {
  const report = await createAnalysis(BODY, makeDeps().deps);
  assert.ok(report.assessment.soilWater && report.assessment.soilWater.tawMm > 0);
  assert.ok(report.vulnerability.soil && report.vulnerability.soil.sandPct === 60);
  assert.ok(report.assessment.soilMoistureSatellite?.rootZonePct !== null);
  assert.ok(report.causes.some((cause) => cause.code === 'surface_runoff'));
  const buffer = report.recommendations.find((rec) => rec.ruleId === 'R-LAND-02');
  assert.equal(buffer?.where, 'wzdłuż południowej granicy działki (w dół spadku)');
  assert.deepEqual(buffer?.location, ELEVATION.lowestPoint);
  assert.ok(report.recommendations.some((rec) => rec.ruleId === 'R-AGRO-03'));
  assert.ok(!report.limitations.some((text) => text.includes('ograniczono')));
});

test('SoilGrids organic matter above 4% is capped and reported in evidence and limitations', async () => {
  const { deps } = makeDeps();
  const rich: SoilLayer[] = SOIL_LAYERS.map((layer) => ({ ...layer, socPct: 4.86 }));
  deps.fetchers = { ...deps.fetchers, soilgrids: okSource('soilgrids', rich) };
  const report = await createAnalysis(BODY, deps);
  assert.ok(report.limitations.some((text) => text.includes('ograniczono do 4%')));
  assert.ok(
    report.vulnerability.evidence.some((item) => item.label.includes('Materia organiczna')),
  );
});

test('SoilGrids error: no soilWater, no soil in vulnerability, data gap soilgrids, partial', async () => {
  const { deps } = makeDeps();
  deps.fetchers = {
    ...deps.fetchers,
    soilgrids: async () => ({
      sourceId: 'soilgrids',
      status: 'error',
      data: null,
      message: 'Źródło zwróciło błąd',
      fetchedAt: null,
      dataPeriod: null,
      durationMs: 1,
    }),
  };
  const report = await createAnalysis(BODY, deps);
  assert.equal(report.status, 'partial');
  assert.equal(report.assessment.soilWater, null);
  assert.equal(report.vulnerability.soil, null);
  assert.ok(gapIds(report).includes('soilgrids'));
});

test('default deps register Sentinel-2, SoilGrids, elevation and overpass fetchers only', () => {
  assert.deepEqual(Object.keys(defaultAnalysesDeps.fetchers).sort(), [
    'elevation',
    'overpass',
    'sentinel2',
    'soilgrids',
  ]);
});

test('Sentinel-2 ok: assessment.satellite filled, NDMI below feeds causes, report complete', async () => {
  const report = await createAnalysis(BODY, makeDeps().deps);
  assert.equal(report.status, 'complete');
  assert.deepEqual(report.assessment.satellite, SATELLITE);
  assert.ok(!gapIds(report).includes('sentinel2'));

  const { deps } = makeDeps();
  const dry = { ...SATELLITE, ndmiAssessment: 'below' as const };
  deps.fetchers = { ...deps.fetchers, sentinel2: okSource('sentinel2', dry) };
  const withDryVegetation = await createAnalysis(BODY, deps);
  assert.ok(withDryVegetation.causes.some((cause) => cause.code === 'low_vegetation_moisture'));
});

test('Sentinel-2 Plan B (NDVI only): satellite kept, explicit NDMI data gap with the reason', async () => {
  const { deps } = makeDeps();
  const ndviOnly = { ...SATELLITE, ndmi: null, ndmiAssessment: 'unknown' as const };
  deps.fetchers = {
    ...deps.fetchers,
    sentinel2: async () => ({
      ...(await okSource('sentinel2', ndviOnly)()),
      message: 'Plan B: budżet czasu na odczyt zdjęcia wyczerpany, policzono tylko NDVI',
    }),
  };
  const report = await createAnalysis(BODY, deps);

  assert.equal(report.assessment.satellite?.ndmi, null);
  const gap = report.dataGaps.find((item) => item.sourceId === 'sentinel2');
  assert.ok(gap);
  assert.match(gap.what, /NDMI/);
  assert.match(gap.what, /Plan B/);
});

test('Sentinel-2 missing (cirrus): satellite null, data gap with the source message, partial', async () => {
  const { deps } = makeDeps();
  deps.fetchers = {
    ...deps.fetchers,
    sentinel2: async () => ({
      sourceId: 'sentinel2',
      status: 'missing',
      data: null,
      message: 'Brak sceny z co najmniej 60% ważnych pikseli (cirrus)',
      fetchedAt: null,
      dataPeriod: null,
      durationMs: 9,
    }),
  };
  const report = await createAnalysis(BODY, deps);
  assert.equal(report.status, 'partial');
  assert.equal(report.assessment.satellite, null);
  const gap = report.dataGaps.find((item) => item.sourceId === 'sentinel2');
  assert.ok(gap?.what.includes('cirrus'));
});

test('hydrology feeds R-LAND-01 for a ditch within 300 m when vulnerability is at least medium', async () => {
  const { deps } = makeDeps();
  deps.fetchers = {
    ...deps.fetchers,
    overpass: okSource('overpass', { ...HYDRO, nearestDitchDistanceM: 200 }),
  };
  const report = await createAnalysis(BODY, deps);
  assert.ok(['medium', 'high'].includes(report.vulnerability.vulnerabilityClass));
  const ditch = report.recommendations.find((rec) => rec.ruleId === 'R-LAND-01');
  assert.ok(ditch);
  assert.deepEqual(ditch.location, HYDRO.nearestDitchPoint);
  assert.ok(ditch.evidence.some((item) => item.sourceId === 'overpass'));
  const far = await createAnalysis(BODY, makeDeps().deps);
  assert.ok(!far.recommendations.some((rec) => rec.ruleId === 'R-LAND-01'));
});

test('hydrology error: no R-LAND-01 or R-LAND-03, data gap overpass, partial', async () => {
  const { deps } = makeDeps();
  deps.fetchers = {
    ...deps.fetchers,
    overpass: async () => ({
      sourceId: 'overpass',
      status: 'error',
      data: null,
      message: 'Źródło zwróciło błąd',
      fetchedAt: null,
      dataPeriod: null,
      durationMs: 1,
    }),
  };
  const report = await createAnalysis(BODY, deps);
  assert.equal(report.status, 'partial');
  assert.ok(gapIds(report).includes('overpass'));
  assert.ok(!report.recommendations.some((rec) => ['R-LAND-01', 'R-LAND-03'].includes(rec.ruleId)));
});

test('no parcel geometry gives 502 UPSTREAM_UNAVAILABLE, unknown parcel gives 404', async () => {
  await expectAppError(
    createAnalysis(BODY, makeDeps({ parcel: 'error' }).deps),
    'UPSTREAM_UNAVAILABLE',
    502,
  );
  await expectAppError(
    createAnalysis(BODY, makeDeps({ parcel: 'missing' }).deps),
    'PARCEL_NOT_FOUND',
    404,
  );
});

test('ULDK timeout gives 504 UPSTREAM_TIMEOUT', async () => {
  await expectAppError(
    createAnalysis(BODY, makeDeps({ parcel: 'timeout' }).deps),
    'UPSTREAM_TIMEOUT',
    504,
  );
});

test('a source that hangs past the budget ends as timeout instead of blocking the analysis', async () => {
  const { deps } = makeDeps();
  deps.budgetMs = 200;
  deps.fetchers = { ...deps.fetchers, overpass: () => new Promise(() => {}) };
  const report = await createAnalysis(BODY, deps);
  const overpass = report.sources.find((s) => s.sourceId === 'overpass');
  assert.equal(overpass?.status, 'timeout');
  assert.equal(overpass?.reasonCode, 'TIMEOUT');
  assert.equal(report.dataGaps.find((gap) => gap.sourceId === 'overpass')?.reasonCode, 'TIMEOUT');
  assert.equal(report.status, 'partial');
});

test('sources[] and dataGaps carry the same reasonCode; eumetsat is NOT_CONFIGURED', async () => {
  const { deps } = makeDeps();
  deps.fetchers = {
    ...deps.fetchers,
    sentinel2: async () => ({
      sourceId: 'sentinel2',
      status: 'missing',
      data: null,
      message: 'Brak sceny z co najmniej 60% ważnych pikseli',
      reasonCode: 'CLOUD_COVER',
      fetchedAt: new Date(),
      dataPeriod: null,
      durationMs: 10,
    }),
  };
  const report = await createAnalysis(BODY, deps);
  for (const [sourceId, code] of [
    ['sentinel2', 'CLOUD_COVER'],
    ['eumetsat', 'NOT_CONFIGURED'],
  ] as const) {
    assert.equal(report.sources.find((s) => s.sourceId === sourceId)?.reasonCode, code);
    assert.equal(report.dataGaps.find((gap) => gap.sourceId === sourceId)?.reasonCode, code);
  }
  assert.equal(report.sources.find((s) => s.sourceId === 'soilgrids')?.reasonCode, null);
});

test('without a database connection the report is returned unsaved with a new ObjectId', async () => {
  const id = await defaultAnalysesDeps.saveReport({} as Parameters<AnalysesDeps['saveReport']>[0]);
  assert.match(id, /^[0-9a-f]{24}$/);
});

test('KBW 30 evidence is attributed to nasa_power when the current 30-day window is missing', async () => {
  const { deps } = makeDeps();
  const original = deps.fetchMeteo;
  deps.fetchMeteo = async (lat, lon, date, signal) => {
    const outcome = await original(lat, lon, date, signal);
    return {
      ...outcome,
      current: {
        ...outcome.current,
        series: outcome.current.series.filter((day) => day.date <= '2026-05-27'),
      },
    };
  };
  const report = await createAnalysis(BODY, deps);
  const kbw30 = report.assessment.evidence.filter((item) => item.label === 'KBW 30 dni');
  assert.ok(kbw30.length > 0);
  assert.ok(kbw30.every((item) => item.sourceId === 'nasa_power'));
});

test('a report save failure still returns the computed report with a new id', async () => {
  const { deps } = makeDeps();
  deps.saveReport = async () => {
    throw new Error('atlas unavailable');
  };
  const report = await createAnalysis(BODY, deps);
  assert.match(report.id, /^[0-9a-f]{24}$/);
  assert.equal(report.parcel.id, BODY.parcelId);
});

test('the sources budget starts after ULDK: a slow geometry fetch does not consume it', async () => {
  const { deps } = makeDeps();
  deps.budgetMs = 300;
  const fetchParcel = deps.fetchParcel;
  deps.fetchParcel = async (parcelId, signal) => {
    await new Promise((done) => setTimeout(done, 400));
    return fetchParcel(parcelId, signal);
  };
  const report = await createAnalysis(BODY, deps);
  assert.equal(report.sources.find((s) => s.sourceId === 'soilgrids')?.status, 'ok');
});
