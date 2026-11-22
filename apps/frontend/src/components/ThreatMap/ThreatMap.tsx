// UI-C-017 ThreatMap: Leaflet map of account parcels colored by drought class, fit to at-risk parcels; ThreatList: at-risk list and legend for the drought tile
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import type { GeoJsonObject } from 'geojson';

import type { DroughtClass, ParcelOverview } from '@/api/types';

import 'leaflet/dist/leaflet.css';

export interface ThreatMapProps {
  items: ParcelOverview[];
  isLoading?: boolean;
  onSelect: (item: ParcelOverview) => void;
  /** T-103: on lg+ fill the parent's height (dashboard one-screen layout) instead of 45vh */
  fill?: boolean;
}

export const DROUGHT_WORDS: Record<DroughtClass, string> = {
  severe: 'Susza silna',
  moderate: 'Susza umiarkowana',
  none: 'Brak suszy',
  unknown: 'Brak danych',
};

// Below this zoom a parcel outline is a few pixels, so a dot in its colour marks it
const DOT_MAX_ZOOM = 12;

function ZoomWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => onZoom(map.getZoom()), [map, onZoom]);
  return null;
}

const classOf = (item: ParcelOverview): DroughtClass => item.lastReport?.droughtClass ?? 'unknown';

const SEVERITY_ORDER: DroughtClass[] = ['severe', 'moderate', 'unknown', 'none'];

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

export function ThreatMap({ items, isLoading = false, onSelect, fill = false }: ThreatMapProps) {
  const { palette } = useTheme();
  const [zoom, setZoom] = useState(6);
  const mapHeight = fill ? { xs: 320, lg: '100%' } : { xs: 320, lg: 'max(360px, 45vh)' };

  if (isLoading) {
    return (
      <Skeleton
        variant="rounded"
        aria-label="Ładowanie mapy"
        sx={{ height: fill ? { xs: 320, lg: '100%' } : 420 }}
      />
    );
  }

  const atRisk = items.filter((item) => item.atRisk);
  // no at-risk parcels: show all of them
  const fitted = atRisk.length > 0 ? atRisk : items;

  return (
    <Stack spacing={2} sx={fill ? { height: { lg: '100%' } } : undefined}>
      <Box
        role="region"
        aria-label="Mapa działek pokolorowanych według suszy"
        sx={{
          width: '100%',
          height: mapHeight,
          borderRadius: 2,
          overflow: 'hidden',
        }}
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
                {zoom >= DOT_MAX_ZOOM && (
                  <Tooltip permanent direction="center">
                    {`${item.parcel.parcelNumber} · ${DROUGHT_WORDS[droughtClass]}`}
                  </Tooltip>
                )}
              </GeoJSON>
            ) : null;
          })}
          {zoom < DOT_MAX_ZOOM &&
            items.map((item) => {
              const color = palette.drought[classOf(item)];
              return (
                <CircleMarker
                  key={`dot-${item.parcel.id}`}
                  center={[item.parcel.centroid.lat, item.parcel.centroid.lon]}
                  radius={10}
                  pathOptions={{ color: '#ffffff', weight: 3, fillColor: color, fillOpacity: 1 }}
                  eventHandlers={{ click: () => item.lastReport && onSelect(item) }}
                >
                  <Tooltip permanent direction="top" offset={[0, -10]}>
                    {`${item.parcel.parcelNumber} · ${DROUGHT_WORDS[classOf(item)]}`}
                  </Tooltip>
                </CircleMarker>
              );
            })}
          <ZoomWatcher onZoom={setZoom} />
          <FitToItems items={fitted} />
        </MapContainer>
      </Box>
    </Stack>
  );
}

// T-103: text list of at-risk parcels and the map legend, shown next to the drought counts on the dashboard.
// When the parent gives it a fixed height (dashboard lg+), only the list scrolls; heading and legend stay.
export function ThreatList({
  items,
  onSelect,
}: {
  items: ParcelOverview[];
  onSelect: (item: ParcelOverview) => void;
}) {
  const { palette } = useTheme();
  // most severe first: Susza silna, then Susza umiarkowana, then the rest
  const atRisk = items
    .filter((item) => item.atRisk)
    .sort((a, b) => SEVERITY_ORDER.indexOf(classOf(a)) - SEVERITY_ORDER.indexOf(classOf(b)));
  return (
    <Stack
      component="section"
      aria-labelledby="lista-zagrozonych-title"
      spacing={2}
      sx={{ minWidth: 0, minHeight: 0, height: { lg: '100%' } }}
    >
      {/* same heading level and style as the „Stan suszy” title next to it */}
      <Typography
        id="lista-zagrozonych-title"
        variant="h2"
        component="h2"
        sx={{ whiteSpace: 'nowrap' }}
      >
        Zagrożone ({atRisk.length})
      </Typography>
      {atRisk.length === 0 ? (
        <Typography sx={{ fontSize: '1.125rem' }}>Brak</Typography>
      ) : (
        <Box
          component="ul"
          aria-label="Zagrożone działki"
          tabIndex={0}
          sx={{
            m: 0,
            p: 0,
            listStyle: 'none',
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'action.hover',
            '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: 2 },
          }}
        >
          {/* list rows: drought-colour dot, parcel number bold, place muted, arrow; one line each,
              a long name ends with „…”, full name and drought class in the tooltip and for screen readers */}
          {atRisk.map((item) => {
            const droughtClass = classOf(item);
            const fullName = `Działka ${item.parcel.parcelNumber}, ${item.parcel.region} – ${DROUGHT_WORDS[droughtClass]}`;
            return (
              <Box
                component="li"
                key={item.parcel.id}
                sx={{
                  minWidth: 0,
                  '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' },
                }}
              >
                <Box
                  component="button"
                  type="button"
                  title={fullName}
                  aria-label={fullName}
                  onClick={() => onSelect(item)}
                  sx={{
                    width: '100%',
                    minHeight: 48,
                    px: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    border: 0,
                    bgcolor: 'transparent',
                    color: 'text.primary',
                    font: 'inherit',
                    fontSize: '1.125rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.selected' },
                    '&:focus-visible': {
                      outline: 2,
                      outlineColor: 'primary.main',
                      outlineOffset: -2,
                    },
                  }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      flex: '0 0 12px',
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: palette.drought[droughtClass],
                    }}
                  />
                  <Box
                    component="span"
                    sx={{
                      flex: '1 1 auto',
                      minWidth: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {`Działka ${item.parcel.parcelNumber}`}
                    </Box>
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      {` · ${item.parcel.region}`}
                    </Box>
                  </Box>
                  <ChevronRightIcon aria-hidden sx={{ flexShrink: 0, color: 'text.secondary' }} />
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Stack>
  );
}
