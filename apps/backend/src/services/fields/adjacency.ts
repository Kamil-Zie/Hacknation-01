// API-016 Parcel adjacency: parcels form one field when the graph "boundary distance <= 50 m" is connected
import { booleanIntersects, lineString, point, pointToLineDistance } from '@turf/turf';
import type { Geometry, Position } from 'geojson';

export const MAX_DISTANCE_M = 50;

export interface ParcelGeometry {
  id: string;
  geometry: Geometry;
}

function rings(geometry: Geometry): Position[][] {
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
}

function vertexToRingsM(from: Position[][], to: Position[][]): number {
  let min = Infinity;
  for (const ring of from) {
    for (const vertex of ring) {
      for (const target of to) {
        const d = pointToLineDistance(point(vertex), lineString(target), { units: 'meters' });
        if (d < min) min = d;
      }
    }
  }
  return min;
}

// Minimal distance between boundaries in metres (0 when they touch or overlap); parcels are small, so vertex-to-edge both ways is enough.
export function boundaryDistanceM(a: Geometry, b: Geometry): number {
  if (booleanIntersects(a, b)) return 0;
  const ringsA = rings(a);
  const ringsB = rings(b);
  return Math.min(vertexToRingsM(ringsA, ringsB), vertexToRingsM(ringsB, ringsA));
}

// Returns ids not connected with the largest group (ties: group of the first parcel); [] means one coherent field.
export function disconnectedParcelIds(parcels: ParcelGeometry[]): string[] {
  const group = parcels.map((_, index) => index);
  const find = (i: number): number => (group[i] === i ? i : (group[i] = find(group[i] as number)));
  for (let i = 0; i < parcels.length; i += 1) {
    for (let j = i + 1; j < parcels.length; j += 1) {
      if (find(i) === find(j)) continue;
      const distance = boundaryDistanceM(
        (parcels[i] as ParcelGeometry).geometry,
        (parcels[j] as ParcelGeometry).geometry,
      );
      if (distance <= MAX_DISTANCE_M) group[find(i)] = find(j);
    }
  }
  const sizes = new Map<number, number>();
  parcels.forEach((_, i) => sizes.set(find(i), (sizes.get(find(i)) ?? 0) + 1));
  let main = find(0);
  for (const [root, size] of sizes) {
    if (size > (sizes.get(main) ?? 0)) main = root;
  }
  return parcels.filter((_, i) => find(i) !== main).map((parcel) => parcel.id);
}
