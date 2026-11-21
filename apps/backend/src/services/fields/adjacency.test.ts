// API-016 Tests of parcel adjacency (synthetic squares: touching, 30 m, 80 m apart)
import assert from 'node:assert/strict';

import type { Geometry } from 'geojson';
import { test } from 'vitest';

import { boundaryDistanceM, disconnectedParcelIds } from '@/services/fields/adjacency';

const LAT = 51.44;
const LON = 21.93;
const M_LAT = 1 / 111195;
const M_LON = 1 / (111195 * Math.cos((LAT * Math.PI) / 180));

// 100 m x 100 m square whose west edge is `offsetM` metres east of LON.
function square(offsetM: number): Geometry {
  const w = LON + offsetM * M_LON;
  const e = w + 100 * M_LON;
  const s = LAT;
  const n = LAT + 100 * M_LAT;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [w, s],
        [e, s],
        [e, n],
        [w, n],
        [w, s],
      ],
    ],
  };
}

test('touching squares are 0 m apart, 30 m gap is about 30 m, 80 m gap is about 80 m', () => {
  assert.equal(boundaryDistanceM(square(0), square(100)), 0);
  assert.ok(Math.abs(boundaryDistanceM(square(0), square(130)) - 30) < 1);
  assert.ok(Math.abs(boundaryDistanceM(square(0), square(180)) - 80) < 1);
});

test('chain with 30 m gaps is one field, an 80 m gap leaves the parcel out', () => {
  const chain = [
    { id: 'A', geometry: square(0) },
    { id: 'B', geometry: square(130) },
    { id: 'C', geometry: square(260) },
  ];
  assert.deepEqual(disconnectedParcelIds(chain), []);
  const far = [...chain.slice(0, 2), { id: 'D', geometry: square(410) }];
  assert.deepEqual(disconnectedParcelIds(far), ['D']);
});
