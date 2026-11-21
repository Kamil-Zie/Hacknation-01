// T-010 T-037 meteo.source tests: synthetic Open-Meteo fixture (fields, units, hourly -> daily, cutoff > D), 429 -> NASA POWER fallback, cache (no network)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { test } from 'vitest';

import type { CachedEntry, SourceCacheStore } from '@/services/sources/cache.service';
import { fetchMeteo, parseOpenMeteoResponse } from '@/services/sources/meteo.source';
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

function stubFetch(archiveStatus: number) {
  const urls: string[] = [];
  const fetchFn = (async (url: string) => {
    urls.push(url);
    if (url.includes('power.larc.nasa.gov'))
      return { ok: true, status: 200, json: async () => NASA };
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

test('drops days after the analysis date', async () => {
  const { fetchFn, urls } = stubFetch(200);
  const outcome = await fetchMeteo(51.4412, 21.9288, '2026-05-20', undefined, {
    cache: memoryCache(),
    fetchFn,
  });
  assert.equal(outcome.source, 'open-meteo');
  assert.equal(outcome.fallback, false);
  assert.equal(outcome.confidencePenalty, 0);
  assert.equal(outcome.series.length, 11);
  assert.ok(outcome.series.every((d) => d.date <= '2026-05-20'));
  assert.equal(outcome.sources[0]?.status, 'ok');
  // One logical fetch = 2 parallel date ranges, ten years and 75 days back, same variables in one request.
  assert.equal(urls.length, 2);
  assert.ok(urls[0]?.includes('start_date=2016-03-06'));
  assert.ok(urls[1]?.includes('end_date=2026-05-20'));
  assert.ok(urls.every((u) => u.includes('soil_moisture_28_to_100cm') && u.includes('et0_fao')));
  assert.ok(
    urls.every((u) => u.includes('timezone=Europe%2FWarsaw') || u.includes('Europe/Warsaw')),
  );
});

test('second call comes from cache without any request', async () => {
  const cache = memoryCache();
  const { fetchFn, urls } = stubFetch(200);
  await fetchMeteo(51.44, 21.93, '2026-05-20', undefined, { cache, fetchFn });
  const calls = urls.length;
  const second = await fetchMeteo(51.4412, 21.9288, '2026-05-20', undefined, { cache, fetchFn });
  assert.equal(urls.length, calls);
  assert.equal(second.sources[0]?.status, 'cached');
  assert.equal(second.series.length, 11);
});

test('HTTP 429 falls back to NASA POWER with penalty, limitations and sources', async () => {
  const { fetchFn } = stubFetch(429);
  const outcome = await fetchMeteo(51.44, 21.93, '2026-06-10', undefined, {
    cache: memoryCache(),
    fetchFn,
  });
  assert.equal(outcome.source, 'nasa_power');
  assert.equal(outcome.fallback, true);
  assert.equal(outcome.confidencePenalty, 0.05);
  assert.ok(outcome.limitations[0]?.includes('NASA POWER'));
  assert.deepEqual(
    outcome.sources.map((s) => [s.sourceId, s.status]),
    [
      ['meteo', 'error'],
      ['nasa_power', 'ok'],
    ],
  );
  assert.ok(outcome.series.length > 3600);
  assert.ok(outcome.series.every((d) => d.date <= '2026-06-10' && d.sm0to7 === null));
  assert.ok(outcome.series.some((d) => d.et0Mm !== null && d.tmeanC !== null));
  assert.ok(outcome.nasaSeries);
  assert.ok(computeSoilMoisture(outcome.nasaSeries, '2026-06-10'));
});

test('both sources failing gives an empty series without throwing', async () => {
  const fetchFn = (async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;
  const outcome = await fetchMeteo(51.44, 21.93, '2026-06-10', undefined, {
    cache: memoryCache(),
    fetchFn,
  });
  assert.equal(outcome.source, null);
  assert.deepEqual(outcome.series, []);
  assert.equal(outcome.confidencePenalty, 0);
});
