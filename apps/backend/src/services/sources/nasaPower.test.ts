// T-037 DM-015 nasa_power tests: real NASA POWER fixture (51.44, 21.93), -999 handling, percentile, Penman-Monteith (FAO-56 ex. 18), Hargreaves fallback, cache (no network)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { test } from 'vitest';

import type { CachedEntry, SourceCacheStore } from '@/services/sources/cache.service';
import {
  computeSoilMoisture,
  extraterrestrialRadiation,
  fetchNasaPowerDaily,
  hargreavesEt0,
  nasaDayEt0,
  parsePowerResponse,
  penmanMonteithEt0,
  toMeteoFallbackSeries,
} from '@/services/sources/nasaPower.source';
import type { NasaPowerDay } from '@/services/sources/nasaPower.source';

const FIXTURE = resolve(
  process.cwd(),
  'src/services/sources/__fixtures__/nasa-power-51.44-21.93.json',
);
const RAW = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Parameters<typeof parsePowerResponse>[0];

function memoryCache(): SourceCacheStore {
  const store = new Map<string, CachedEntry>();
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, _sourceId, payload, _ttlMs, dataPeriod) => {
      store.set(key, { payload, dataPeriod, fetchedAt: new Date() });
    },
  };
}

test('parsePowerResponse maps -999 to null and never lets it into the series', () => {
  const raw = {
    properties: {
      parameter: {
        GWETTOP: { '20260608': 0.4, '20260609': -999 },
        GWETROOT: { '20260608': 0.35, '20260609': -999 },
      },
    },
  };
  const series = parsePowerResponse(raw);
  assert.equal(series.length, 2);
  assert.equal(series[0]?.gwetRoot, 0.35);
  assert.equal(series[1]?.gwetTop, null);
  assert.equal(series[1]?.gwetRoot, null);
  assert.equal(series[1]?.t2m, null);
  const fixtureSeries = parsePowerResponse(RAW);
  assert.ok(fixtureSeries.length > 3600);
  assert.ok(
    fixtureSeries.every((d) =>
      [d.gwetTop, d.gwetRoot, d.gwetProf, d.precipitationMm, d.t2m].every(
        (v) => v === null || v > -900,
      ),
    ),
  );
});

test('Bronowice 2026-06-10: dry, low percentile, root zone about 35%', () => {
  const result = computeSoilMoisture(parsePowerResponse(RAW), '2026-06-10');
  assert.ok(result);
  assert.equal(result.assessment, 'dry');
  assert.ok(result.percentile !== null && result.percentile <= 10);
  assert.ok(result.rootZonePct !== null && Math.abs(result.rootZonePct - 35) < 2);
  assert.ok(result.normRootZonePct !== null && result.anomalyPp !== null && result.anomalyPp < 0);
  assert.equal(result.observedAt, '2026-06-10T00:00:00.000Z');
  assert.equal(result.ageDays, 0);
  assert.equal(result.granuleId, null);
  assert.equal(result.distanceKm, null);
  assert.equal(result.resolutionKm, 50);
});

test('analysis date with missing last days uses the last valid day and reports its age', () => {
  const series = parsePowerResponse(RAW).map((day): NasaPowerDay => {
    return day.date > '2026-06-08'
      ? { ...day, gwetTop: null, gwetRoot: null, gwetProf: null }
      : day;
  });
  const result = computeSoilMoisture(series, '2026-06-10');
  assert.ok(result);
  assert.equal(result.observedAt, '2026-06-08T00:00:00.000Z');
  assert.equal(result.ageDays, 2);
  assert.ok(computeSoilMoisture([], '2026-06-10') === null);
});

test('Hargreaves: Ra matches FAO-56 example 8 and ET0 matches hand calculation', () => {
  // FAO-56 example 8: 3 September (J = 246) at 20 deg S, Ra = 32.2 MJ m-2 d-1.
  assert.ok(Math.abs(extraterrestrialRadiation(-20, 246) - 32.2) < 0.1);
  // tmin 20, tmax 30, tmean 25: 0.0023 * 42.8 * sqrt(10) * 0.408 * 32.2 = 4.09 mm/d.
  assert.ok(Math.abs(hargreavesEt0(20, 30, 25, -20, 246) - 4.09) < 0.1);
});

test('Penman-Monteith matches FAO-56 example 18 (Uccle, 6 July, ET0 3.9 mm/d)', () => {
  // FAO-56 example 18: 50°48'N, 100 m, Tmax 21.5, Tmin 12.3, RHmax 84, RHmin 63, u2 2.078 m/s,
  // Rs 22.07 MJ m-2 d-1, P 100.1 kPa, J = 187. RHmean (73.5%) instead of RHmax/RHmin moves ea slightly.
  const et0 = penmanMonteithEt0({
    tmin: 12.3,
    tmax: 21.5,
    rhMeanPct: 73.5,
    windMs: 2.078,
    pressureKpa: 100.1,
    solarMj: 22.07,
    latDeg: 50.8,
    dayOfYear: 187,
    elevationM: 100,
  });
  assert.ok(Math.abs(et0 - 3.9) < 0.3, `ET0 ${et0}`);
  // Without measured Rs the radiation is estimated from the temperature range: still plausible.
  const estimated = penmanMonteithEt0({
    tmin: 12.3,
    tmax: 21.5,
    rhMeanPct: 73.5,
    windMs: 2.078,
    pressureKpa: 100.1,
    solarMj: null,
    latDeg: 50.8,
    dayOfYear: 187,
  });
  assert.ok(estimated > 2 && estimated < 5);
});

test('nasaDayEt0 uses Penman-Monteith with full inputs and Hargreaves without humidity or wind', () => {
  const base: NasaPowerDay = {
    date: '2026-07-06',
    gwetTop: null,
    gwetRoot: null,
    gwetProf: null,
    precipitationMm: 0,
    t2m: 17,
    tmaxC: 21.5,
    tminC: 12.3,
    rhPct: 73.5,
    windMs: 2.1,
    solarMj: 22.07,
    pressureKpa: 100.1,
  };
  assert.equal(nasaDayEt0(base, 50.8)?.method, 'penman-monteith');
  assert.equal(
    nasaDayEt0({ ...base, solarMj: null }, 50.8)?.method,
    'penman-monteith-rs-estimated',
  );
  assert.equal(nasaDayEt0({ ...base, windMs: null }, 50.8)?.method, 'hargreaves');
  assert.equal(nasaDayEt0({ ...base, tmaxC: null }, 50.8), null);
});

test('toMeteoFallbackSeries gives precipitation, temperatures and plausible June ET0', () => {
  const series = parsePowerResponse(RAW).filter((d) => d.date.startsWith('2025-06'));
  const fallback = toMeteoFallbackSeries(series, 51.44);
  assert.equal(fallback.length, 30);
  const et0 = fallback.map((d) => d.et0Mm).filter((v): v is number => v !== null);
  assert.equal(et0.length, 30);
  assert.ok(et0.every((v) => v > 0.5 && v < 8));
  assert.ok(fallback.every((d) => d.precipitationMm !== null && d.tmaxC !== null));
});

test('one request per analysis, second call comes from cache', async () => {
  const cache = memoryCache();
  let calls = 0;
  let requestedUrl = '';
  const fetchFn = (async (url: string) => {
    calls += 1;
    requestedUrl = url;
    return { ok: true, status: 200, json: async () => RAW };
  }) as unknown as typeof fetch;
  const first = await fetchNasaPowerDaily(51.4412, 21.9288, '2026-06-10', undefined, {
    cache,
    fetchFn,
  });
  const second = await fetchNasaPowerDaily(51.44, 21.93, '2026-06-10', undefined, {
    cache,
    fetchFn,
  });
  assert.equal(first.status, 'ok');
  assert.equal(second.status, 'cached');
  assert.equal(calls, 1);
  assert.ok(requestedUrl.includes('latitude=51.44') && requestedUrl.includes('longitude=21.93'));
  assert.ok(requestedUrl.includes('start=20160101') && requestedUrl.includes('end=20260610'));
  assert.ok(requestedUrl.includes('GWETROOT') && requestedUrl.includes('T2M_MIN'));
  assert.ok(first.data && first.data.length > 3600);
});

test('HTTP 429 gives status error without throwing', async () => {
  const fetchFn = (async () => ({ ok: false, status: 429 })) as unknown as typeof fetch;
  const result = await fetchNasaPowerDaily(51.44, 21.93, '2026-06-10', undefined, {
    cache: memoryCache(),
    fetchFn,
  });
  assert.equal(result.status, 'error');
  assert.equal(result.data, null);
});
