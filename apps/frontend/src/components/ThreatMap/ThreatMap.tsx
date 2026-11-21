// UI-C-017 ThreatMap: Leaflet map of account parcels colored by drought class, fit to at-risk parcels, legend and text list below
import { Box, Link, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import { useEffect } from 'react';
import { GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import type { GeoJsonObject } from 'geojson';

import type { DroughtClass, ParcelOverview } from '@/api/types';

import 'leaflet/dist/leaflet.css';

export interface ThreatMapProps {
  items: ParcelOverview[];
  isLoading?: boolean;
  onSelect: (item: ParcelOverview) => void;
}

export const DROUGHT_WORDS: Record<DroughtClass, string> = {
  severe: 'Susza silna',
  moderate: 'Susza umiarkowana',
  none: 'Brak suszy',
  unknown: 'Brak danych',
};

const classOf = (item: ParcelOverview): DroughtClass => item.lastReport?.droughtClass ?? 'unknown';

function FitToItems({ items }: { items: ParcelOverview[] }) {
  const map = useMap();
  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      const points: [number, number][] = [];
      for (const item of items) {
        const geometry = item.parcel.geometry;
        if (!geometry) continue;
        const rings =
          geometry.type === 'Polygon'
            ? [geometry.coordinates[0]]
            : geometry.coordinates.map((polygon) => polygon[0]);
        for (const ring of rings) for (const [lon, lat] of ring ?? []) points.push([lat, lon]);
      }
      if (points.length > 0) {
        map.fitBounds(points as LatLngBoundsExpression, { padding: [24, 24], maxZoom: 15 });
      }
    };
    map.whenReady(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, items]);
  return null;
}

export function ThreatMap({ items, isLoading = false, onSelect }: ThreatMapProps) {
  const { palette } = useTheme();

  if (isLoading) {
    return <Skeleton variant="rounded" height={420} aria-label="Ładowanie mapy" />;
  }

  const atRisk = items.filter((item) => item.atRisk);
  // no at-risk parcels: show all of them
  const fitted = atRisk.length > 0 ? atRisk : items;

  return (
    <Stack spacing={2}>
      <Box
        role="region"
        aria-label="Mapa działek pokolorowanych według suszy"
        sx={{ width: '100%', height: { xs: 320, lg: 460 }, borderRadius: 2, overflow: 'hidden' }}
      >
        <MapContainer
          center={[52, 19.4]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {items.map((item) => {
            const droughtClass = classOf(item);
            const color = palette.drought[droughtClass];
            return item.parcel.geometry ? (
              <GeoJSON
                key={`${item.parcel.id}-${droughtClass}`}
                data={item.parcel.geometry as unknown as GeoJsonObject}
                style={{
                  color,
                  weight: 4,
                  fillColor: color,
                  fillOpacity: 0.35,
                  dashArray: droughtClass === 'unknown' ? '8 6' : undefined,
                }}
                eventHandlers={{ click: () => item.lastReport && onSelect(item) }}
              >
                <Tooltip permanent direction="center">
                  {`${item.parcel.parcelNumber} · ${DROUGHT_WORDS[droughtClass]}`}
                </Tooltip>
              </GeoJSON>
            ) : null;
          })}
          <FitToItems items={fitted} />
        </MapContainer>
      </Box>
      <Typography component="p" sx={{ fontSize: '1.125rem' }}>
        Kolory obrysów: {DROUGHT_WORDS.severe}, {DROUGHT_WORDS.moderate}, {DROUGHT_WORDS.none},{' '}
        {DROUGHT_WORDS.unknown} (linia przerywana).
      </Typography>
      {atRisk.length > 0 && (
        <Box component="ul" aria-label="Zagrożone działki" sx={{ m: 0, pl: 3 }}>
          {atRisk.map((item) => (
            <Typography component="li" key={item.parcel.id} sx={{ fontSize: '1.125rem', py: 0.5 }}>
              <Link
                component="button"
                type="button"
                onClick={() => onSelect(item)}
                sx={{ fontSize: 'inherit', minHeight: 48, textAlign: 'left' }}
              >
                {`Działka ${item.parcel.parcelNumber}, ${item.parcel.region}`}
              </Link>
              {` – ${DROUGHT_WORDS[classOf(item)]}`}
            </Typography>
          ))}
        </Box>
      )}
    </Stack>
  );
}
