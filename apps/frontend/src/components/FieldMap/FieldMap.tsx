// UI-S-008 FieldMap: Leaflet map of a field, each parcel outline colored by drought class with number label
import { Box, useTheme } from '@mui/material';
import { useEffect } from 'react';
import { GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import type { GeoJsonObject } from 'geojson';

import type { DroughtClass, Parcel } from '@/api/types';

import 'leaflet/dist/leaflet.css';

export interface FieldMapShape {
  id: string;
  /** Short text on the map, e.g. "612 · Susza silna" */
  label: string;
  droughtClass: DroughtClass;
  geometry: Parcel['geometry'] | null;
}

interface FieldMapProps {
  shapes: FieldMapShape[];
}

function FitToShapes({ shapes }: FieldMapProps) {
  const map = useMap();
  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      const bounds: [number, number][] = [];
      for (const shape of shapes) {
        if (!shape.geometry) continue;
        const rings =
          shape.geometry.type === 'Polygon'
            ? [shape.geometry.coordinates[0]]
            : shape.geometry.coordinates.map((polygon) => polygon[0]);
        for (const ring of rings) for (const [lon, lat] of ring ?? []) bounds.push([lat, lon]);
      }
      if (bounds.length > 0) {
        map.fitBounds(bounds as LatLngBoundsExpression, { padding: [24, 24], maxZoom: 18 });
      }
    };
    map.whenReady(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, shapes]);
  return null;
}

export function FieldMap({ shapes }: FieldMapProps) {
  const { palette } = useTheme();
  return (
    <Box
      role="region"
      aria-label="Mapa grupy działek pokolorowanych według suszy"
      sx={{
        width: '100%',
        height: { xs: 320, md: 440 },
        borderRadius: 2,
        overflow: 'hidden',
        breakInside: 'avoid',
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
        {shapes.map((shape) =>
          shape.geometry ? (
            <GeoJSON
              key={`${shape.id}-${shape.droughtClass}`}
              data={shape.geometry as unknown as GeoJsonObject}
              style={{
                color: palette.drought[shape.droughtClass],
                weight: 4,
                fillColor: palette.drought[shape.droughtClass],
                fillOpacity: 0.35,
                dashArray: shape.droughtClass === 'unknown' ? '8 6' : undefined,
              }}
            >
              <Tooltip permanent direction="center">
                {shape.label}
              </Tooltip>
            </GeoJSON>
          ) : null,
        )}
        <FitToShapes shapes={shapes} />
      </MapContainer>
    </Box>
  );
}
