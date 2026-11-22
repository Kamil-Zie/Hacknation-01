// UI-C-002 T-103 HoverParcel: outlines the parcel under the cursor on the add-parcel map (API-002 by point, debounced and cached)
import { useTheme } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { GeoJSON, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { GeoJsonObject } from 'geojson';

import { getParcelByPoint } from '@/api/parcels';
import type { Parcel, ParcelGeometry } from '@/api/types';

// ask ULDK only after the cursor rests this long: one request per pause, not per mouse move
const HOVER_DELAY_MS = 700;
// parcels already fetched are reused while the cursor stays inside them
const CACHE_SIZE = 60;

type Ring = number[][];

// ray casting on [lon, lat] rings; holes count as outside
function inRing(ring: Ring, lon: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(rings: Ring[], lon: number, lat: number): boolean {
  const [outer, ...holes] = rings;
  return !!outer && inRing(outer, lon, lat) && !holes.some((hole) => inRing(hole, lon, lat));
}

function contains(geometry: ParcelGeometry, lat: number, lon: number): boolean {
  return geometry.type === 'Polygon'
    ? inPolygon(geometry.coordinates as Ring[], lon, lat)
    : (geometry.coordinates as Ring[][]).some((polygon) => inPolygon(polygon, lon, lat));
}

export function HoverParcel({ minZoom }: { minZoom: number }) {
  const theme = useTheme();
  const map = useMap();
  const [hovered, setHovered] = useState<Parcel | null>(null);
  const cache = useRef<Parcel[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    requestId.current += 1;
  };

  useEffect(() => cancel, []);

  useMapEvents({
    mousemove: (event) => {
      const { lat, lng } = event.latlng;
      if (map.getZoom() < minZoom) {
        cancel();
        setHovered(null);
        return;
      }
      const known = cache.current.find((parcel) => contains(parcel.geometry, lat, lng));
      if (known) {
        cancel();
        setHovered(known);
        return;
      }
      cancel();
      const id = requestId.current;
      timer.current = setTimeout(() => {
        getParcelByPoint(lat, lng)
          .then((parcel) => {
            cache.current = [parcel, ...cache.current.filter((p) => p.id !== parcel.id)].slice(
              0,
              CACHE_SIZE,
            );
            if (requestId.current === id) setHovered(parcel);
          })
          .catch(() => {
            // no parcel there or ULDK busy: just no outline
            if (requestId.current === id) setHovered(null);
          });
      }, HOVER_DELAY_MS);
    },
    mouseout: () => {
      cancel();
      setHovered(null);
    },
    zoomend: () => {
      if (map.getZoom() < minZoom) setHovered(null);
    },
  });

  if (!hovered) return null;
  return (
    <GeoJSON
      key={`hover-${hovered.id}`}
      data={hovered.geometry as unknown as GeoJsonObject}
      interactive={false}
      style={{
        color: theme.palette.warning.main,
        weight: 4,
        dashArray: '6 4',
        fillColor: theme.palette.warning.main,
        fillOpacity: 0.18,
      }}
    >
      <Tooltip permanent direction="top" opacity={1}>
        {`Działka ${hovered.parcelNumber} – kliknij, aby wybrać`}
      </Tooltip>
    </GeoJSON>
  );
}
