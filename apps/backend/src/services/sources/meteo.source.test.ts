// T-010 T-037 meteo.source tests (ADR-009): 90-day Open-Meteo window, NASA POWER always, 429 fallback, missing NASA -> climatology null + dataGap, roles, cache (no network)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { test } from 'vitest';

import type { CachedEntry, SourceCacheStore } from '@/services/sources/cache.service';
import { fetchMeteo, parseOpenMeteoResponse } from '@/services/sources/meteo.source';
import { computeEra5LandSoilMoisture } from '@/services/sources/era5land';
import { computeSoilMoisture, parsePowerResponse } from '@/services/sources/nasaPower.source';

const FIXTURES = resolve(process.cwd(), 'src/services/sources/__fixtures__');
const OPEN_METEO = JSON.parse(
  readFileSync(resolve(FIXTURES, 'open-meteo-synthetic-51.44-21.93.json'), 'utf8'),
) as Parameters<typeof parseOpenMeteoResponse>[0];
const NASA = JSON.parse(
  readFileSync(resolve(FIXTURES, 'nasa-power-51.44-21.93.json'), 'utf8'),
) as Parameters<typeof parsePowerResponse>[0];

function memoryCache(): SourceCacheStore {
  const store = new Map<string, CachedEntry>();
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, _sourceId, payload, _ttlMs, dataPeriod) => {
      store.set(key, { payload, dataPeriod, fetchedAt: new Date() });
    },
  };
}

// Stub of the archive API: returns the part of the synthetic fixture inside start_date..end_date.
function archiveBody(url: string): unknown {
  const params = new URL(url).searchParams;
  const from = params.get('start_date') ?? '';
  const to = params.get('end_date') ?? '';
  const daily = OPEN_METEO.daily ?? {};
  const hourly = OPEN_METEO.hourly ?? {};
  const pick = (source: Record<string, unknown[] | undefined>, dateOf: (i: number) => string) => {
    const keep = (source.time ?? []).map((_, i) => dateOf(i) >= from && dateOf(i) <= to);
    return Object.fromEntries(
      Object.entries(source).map(([key, values]) => [
        key,
        (values ?? []).filter((_, i) => keep[i]),
      ]),
    );
  };
  return {
    daily: pick(daily, (i) => String(daily.time?.[i])),
    hourly: pick(hourly, (i) => String(hourly.time?.[i]).slice(0, 10)),
  };
}

function stubFetch(archiveStatus: number, nasaOk = true) {
  const urls: string[] = [];
  const fetchFn = (async (url: string) => {
    urls.push(url);
    if (url.includes('power.larc.nasa.gov')) {
      return nasaOk
        ? { ok: true, status: 200, json: async () => NASA }
        : { ok: false, status: 503 };
    }
    if (archiveStatus !== 200) return { ok: false, status: archiveStatus };
    return { ok: true, status: 200, json: async () => archiveBody(url) };
  }) as unknown as typeof fetch;
  return { fetchFn, urls };
}

test('maps fields and units, aggregates hourly soil moisture to daily means', () => {
  const series = parseOpenMeteoResponse(OPEN_METEO, '2026-06-10');
  assert.equal(series.length, 32);
  // 2026-05-15 is day index 5 of the synthetic fixture.
  const day = series.find((d) => d.date === '2026-05-15');
  assert.ok(day);
  assert.equal(day.precipitationMm, 0);
  assert.equal(day.tmaxC, 23);
  assert.equal(day.tminC, 8);
  assert.equal(day.tmeanC, 15.5);
  assert.equal(day.et0Mm, 2.5);
  assert.ok(Math.abs((day.sm0to7 ?? 0) - 0.29) < 1e-4);
  assert.ok(Math.abs((day.sm7to28 ?? 0) - 0.275) < 1e-4);
  assert.ok(Math.abs((day.sm28to100 ?? 0) - 0.3475) < 1e-4);
  // ERA5-Land lag: last two days have no soil moisture (all hourly values null).
  const last = series[series.length - 1];
  assert.equal(last?.date, '2026-06-10');
  assert.equal(last?.sm0to7, null);
  assert.equal(last?.precipitationMm, 0);
});

test('Open-Meteo gets one request for D-90..D, NASA POWER is always called, days after D dropped', async () => {
  const { fetchFn, urls } = stubFetch(200);
  const outcome = await fetchMeteo(51.4412, 21.9288, '2026-05-20', undefined, {
    cache: memoryCache(),
    fetchFn,
  });
  assert.equal(outcome.current.source, 'open-meteo');
  assert.equal(outcome.current.fallback, false);
  assert.equal(outcome.confidencePenalty, 0);
  assert.equal(outcome.current.series.length, 11);
  assert.ok(outcome.current.series.every((d) => d.date <= '2026-05-20'));
  const archive = urls.filter((u) => u.includes('open-meteo'));
  assert.equal(archive.length, 1);
  assert.ok(archive[0]?.includes('start_date=2026-02-19'));
  assert.ok(archive[0]?.includes('end_date=2026-05-20'));
  assert.ok(archive[0]?.includes('soil_moisture_28_to_100cm') && archive[0]?.includes('et0_fao'));
  assert.ok(archive[0]?.includes('Europe%2FWarsaw') || archive[0]?.includes('Europe/Warsaw'));
  assert.equal(urls.filter((u) => u.includes('power.larc.nasa.gov')).length, 1);
  assert.ok(outcome.climatology && outcome.climatology.series.length > 3600);
  assert.ok(outcome.climatology.series.some((d) => d.et0Mm !== null));
  assert.ok(outcome.nasaSeries);
  assert.deepEqual(outcome.dataGaps, []);
  assert.ok(outcome.limitations.some((l) => l.includes('NASA POWER') && l.includes('Open-Meteo')));
});

test('sources carry roles: meteo current, nasa_power climatology', async () => {
  const { fetchFn } = stubFetch(200);
  const outcome = await fetchMeteo(51.44, 21.93, '2026-05-20', undefined, {
    cache: memoryCache(),
    fetchFn,
  });
  assert.deepEqual(
    outcome.sources.map((s) => [s.sourceId, s.status, s.role, s.data]),
    [
      ['meteo', 'ok', 'current', null],
      ['nasa_power', 'ok', 'climatology', null],
    ],
  );
});

test('second call comes from cache without any request', async () => {
  const cache = memoryCache();
  const { fetchFn, urls } = stubFetch(200);
  await fetchMeteo(51.44, 21.93, '2026-05-20', undefined, { cache, fetchFn });
  const calls = urls.length;
  const second = await fetchMeteo(51.4412, 21.9288, '2026-05-20', undefined, { cache, fetchFn });
  assert.equal(urls.length, calls);
  assert.deepEqual(
    second.sources.map((s) => s.status),
    ['cached', 'cached'],
  );
  assert.equal(second.current.series.length, 11);
});

test('HTTP 429 takes the last 90 days from NASA POWER with penalty, role fallback and limitations', async () => {
  const { fetchFn } = stubFetch(429);
  const outcome = await fetchMeteo(51.44, 21.93, '2026-06-10', undefined, {
    cache: memoryCache(),
    fetchFn,
  });
  assert.equal(outcome.current.source, 'nasa_power');
  assert.equal(outcome.current.fallback, true);
  assert.equal(outcome.confidencePenalty, 0.05);
  assert.ok(outcome.limitations[0]?.includes('NASA POWER'));
  assert.deepEqual(
    outcome.sources.map((s) => [s.sourceId, s.status, s.role]),
    [
      ['meteo', 'error', 'current'],
      ['nasa_power', 'ok', 'fallback'],
    ],
  );
  assert.equal(outcome.current.series.length, 91);
  assert.equal(outcome.current.series[0]?.date, '2026-03-12');
  assert.ok(outcome.current.series.every((d) => d.date <= '2026-06-10' && d.sm0to7 === null));
  assert.ok(outcome.current.series.some((d) => d.et0Mm !== null && d.tmeanC !== null));
  assert.ok(outcome.climatology && outcome.climatology.series.length > 3600);
  assert.ok(outcome.nasaSeries);
  assert.ok(computeSoilMoisture(outcome.nasaSeries, '2026-06-10'));
});

test('missing NASA POWER gives climatology null and a dataGap, current stays from Open-Meteo', async () => {
  const { fetchFn } = stubFetch(200, false);
  const outcome = await fetchMeteo(51.44, 21.93, '2026-05-20', undefined, {
    cache: memoryCache(),
    fetchFn,
  });
  assert.equal(outcome.current.source, 'open-meteo');
  assert.equal(outcome.climatology, null);
  assert.equal(outcome.nasaSeries, null);
  assert.equal(outcome.dataGaps.length, 1);
  assert.equal(outcome.dataGaps[0]?.sourceId, 'nasa_power');
  assert.equal(outcome.sources[1]?.status, 'error');
  assert.equal(outcome.sources[1]?.role, 'climatology');
});

test('both sources failing gives empty current, null climatology and a dataGap without throwing', async () => {
  const fetchFn = (async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;
  const outcome = await fetchMeteo(51.44, 21.93, '2026-06-10', undefined, {
    cache: memoryCache(),
    fetchFn,
  });
  assert.equal(outcome.current.source, null);
  assert.deepEqual(outcome.current.series, []);
  assert.equal(outcome.climatology, null);
  assert.equal(outcome.confidencePenalty, 0);
  assert.equal(outcome.dataGaps.length, 1);
});

test('soil moisture: current values from ERA5-Land, percentile and assessment from NASA POWER', async () => {
  const { fetchFn } = stubFetch(200);
  const outcome = await fetchMeteo(51.44, 21.93, '2026-06-10', undefined, {
    cache: memoryCache(),
    fetchFn,
  });
  const nasa = outcome.nasaSeries ? computeSoilMoisture(outcome.nasaSeries, '2026-06-10') : null;
  assert.ok(nasa);
  const { soilMoisture } = computeEra5LandSoilMoisture(
    outcome.current.series,
    '2026-06-10',
    0.4,
    0.1,
    nasa,
  );
  assert.ok(soilMoisture);
  assert.equal(soilMoisture.theta0to7M3, 0.248); // ERA5-Land
  assert.equal(soilMoisture.percentile, nasa.percentile); // NASA
  assert.equal(soilMoisture.anomalyPp, nasa.anomalyPp);
  // Norm is shifted to the ERA5-Land scale (current minus NASA anomaly), not copied from NASA.
  if (soilMoisture.rootZonePct !== null && nasa.anomalyPp !== null) {
    const expected = Math.min(100, Math.max(0, soilMoisture.rootZonePct - nasa.anomalyPp));
    assert.ok(Math.abs((soilMoisture.normRootZonePct ?? -1) - expected) < 0.11);
  }
  assert.equal(soilMoisture.assessment, nasa.assessment);
});
