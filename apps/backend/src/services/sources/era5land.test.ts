// T-037 DM-015 era5land tests: layers and units, % of capacity, 7-day mean; percentile and assessment come from NASA POWER (ADR-009), no network
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { test } from 'vitest';

import { computeEra5LandSoilMoisture } from '@/services/sources/era5land';
import { parseOpenMeteoResponse } from '@/services/sources/meteo.source';
import type { SoilMoisture } from '@/services/sources/nasaPower.source';
import type { MeteoDay } from '@/services/sources/meteo.source';

const DAY_MS = 86_400_000;
const FIXTURE = resolve(
  process.cwd(),
  'src/services/sources/__fixtures__/open-meteo-synthetic-51.44-21.93.json',
);
const OPEN_METEO = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Parameters<
  typeof parseOpenMeteoResponse
>[0];
const FC = 0.4;
const WP = 0.1;

function day(date: string, mid: number, deep: number): MeteoDay {
  return {
    date,
    precipitationMm: 0,
    tmeanC: 15,
    tmaxC: 20,
    tminC: 10,
    et0Mm: 3,
    sm0to7: mid + 0.02,
    sm7to28: mid,
    sm28to100: deep,
  };
}

// 10 previous years around 2026-06-10 (+-15 days) with root-zone theta 0.2655..0.3105, plus 7 current days.
function synthetic(currentMid: number, currentDeep: number): MeteoDay[] {
  const series: MeteoDay[] = [];
  for (let year = 1; year <= 10; year += 1) {
    const center = Date.UTC(2026 - year, 5, 10);
    for (let offset = -15; offset <= 15; offset += 1) {
      const mid = 0.25 + (Math.abs(offset + year) % 10) * 0.005;
      series.push(
        day(new Date(center + offset * DAY_MS).toISOString().slice(0, 10), mid, mid + 0.02),
      );
    }
  }
  for (let i = 6; i >= 0; i -= 1) {
    series.push(
      day(
        new Date(Date.UTC(2026, 5, 10) - i * DAY_MS).toISOString().slice(0, 10),
        currentMid,
        currentDeep,
      ),
    );
  }
  return series;
}

test('fixture: 7-day mean to the last valid day, theta and % of capacity, age in days', () => {
  const series = parseOpenMeteoResponse(OPEN_METEO, '2026-06-10');
  const { soilMoisture, status } = computeEra5LandSoilMoisture(series, '2026-06-10', FC, WP);
  assert.equal(status, 'ok');
  assert.ok(soilMoisture);
  assert.equal(soilMoisture.observedAt, '2026-06-08T00:00:00.000Z');
  assert.equal(soilMoisture.ageDays, 2);
  assert.equal(soilMoisture.theta0to7M3, 0.248);
  assert.equal(soilMoisture.valuePct, 49.3);
  assert.equal(soilMoisture.thetaFcM3, FC);
  assert.equal(soilMoisture.thetaWpM3, WP);
  assert.equal(soilMoisture.percentile, null); // fixture has no 10-year history
  assert.equal(soilMoisture.resolutionKm, 9);
  assert.equal(soilMoisture.fallback, false);
  assert.equal(soilMoisture.granuleId, null);
  assert.equal(soilMoisture.distanceKm, null);
});

test('root zone is the thickness-weighted mean, profile covers 0-100 cm', () => {
  const series = synthetic(0.25, 0.3);
  const { soilMoisture } = computeEra5LandSoilMoisture(series, '2026-06-10', FC, WP);
  assert.ok(soilMoisture);
  // root theta = (0.25 * 21 + 0.3 * 72) / 93 = 0.28871 -> (0.28871 - 0.1) / 0.3 = 62.9 %.
  assert.equal(soilMoisture.rootZonePct, 62.9);
  // profile theta = (0.27 * 7 + 0.25 * 21 + 0.3 * 72) / 100 = 0.2874 -> 62.5 %.
  assert.equal(soilMoisture.profilePct, 62.5);
});

const NASA: SoilMoisture = {
  label: 'Wilgotność gleby',
  valuePct: 38,
  rootZonePct: 35.1,
  profilePct: 36,
  percentile: 4,
  normRootZonePct: 52.3,
  anomalyPp: -17.2,
  assessment: 'dry',
  observedAt: '2026-06-10T00:00:00.000Z',
  ageDays: 0,
  product: 'NASA',
  collectionId: 'POWER',
  granuleId: null,
  resolutionKm: 50,
  depthLabel: '',
  distanceKm: null,
};

test('percentile, norm, anomaly and assessment come from NASA, absolute values stay ERA5-Land', () => {
  const { soilMoisture } = computeEra5LandSoilMoisture(
    synthetic(0.33, 0.35),
    '2026-06-10',
    FC,
    WP,
    NASA,
  );
  assert.ok(soilMoisture);
  assert.equal(soilMoisture.percentile, 4);
  assert.equal(soilMoisture.normRootZonePct, 52.3);
  assert.equal(soilMoisture.anomalyPp, -17.2);
  assert.equal(soilMoisture.assessment, 'dry');
  assert.equal(soilMoisture.theta7to28M3, 0.33); // not NASA
  assert.ok((soilMoisture.rootZonePct ?? 0) > 70);
});

test('without NASA relative fields are null and assessment uses the absolute level only', () => {
  const dry = computeEra5LandSoilMoisture(synthetic(0.12, 0.13), '2026-06-10', FC, WP);
  assert.equal(dry.soilMoisture?.percentile, null);
  assert.equal(dry.soilMoisture?.normRootZonePct, null);
  assert.equal(dry.soilMoisture?.anomalyPp, null);
  assert.equal(dry.soilMoisture?.assessment, 'dry');
  const wet = computeEra5LandSoilMoisture(synthetic(0.33, 0.35), '2026-06-10', FC, WP);
  assert.equal(wet.soilMoisture?.assessment, 'wet');
});

test('without theta fc and wp percentages are null but theta values stay', () => {
  const { soilMoisture } = computeEra5LandSoilMoisture(
    synthetic(0.2, 0.22),
    '2026-06-10',
    null,
    null,
    NASA,
  );
  assert.ok(soilMoisture);
  assert.equal(soilMoisture.valuePct, null);
  assert.equal(soilMoisture.rootZonePct, null);
  assert.equal(soilMoisture.thetaFcM3, null);
  assert.equal(soilMoisture.theta7to28M3, 0.2);
  assert.equal(soilMoisture.theta28to100M3, 0.22);
  assert.equal(soilMoisture.percentile, 4);
});

test('series without soil moisture (fallback) gives status missing', () => {
  const series = synthetic(0.25, 0.3).map((d) => ({
    ...d,
    sm0to7: null,
    sm7to28: null,
    sm28to100: null,
  }));
  assert.deepEqual(computeEra5LandSoilMoisture(series, '2026-06-10', FC, WP), {
    soilMoisture: null,
    status: 'missing',
  });
});
