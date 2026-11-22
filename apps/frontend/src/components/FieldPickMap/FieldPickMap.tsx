// UI-S-007 FieldPickMap: Leaflet map with many numbered parcel outlines at once, click to add a parcel
import { Box, useTheme } from '@mui/material';
import { useEffect } from 'react';
import { GeoJSON, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import type { GeoJsonObject } from 'geojson';

import type { Parcel } from '@/api/types';
import { MapLayerToggle } from '@/components/MapLayerToggle/MapLayerToggle';
import { MAP_LAYERS, useMapLayer } from '@/components/MapLayerToggle/mapLayers';

import 'leaflet/dist/leaflet.css';

interface FieldPickMapProps {
  parcels: Parcel[];
  onPick?: (lat: number, lon: number) => void;
}

function ClickHandler({ onPick }: { onPick?: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (event) => onPick?.(event.latlng.lat, event.latlng.lng) });
  return null;
}

function FitToParcels({ parcels }: { parcels: Parcel[] }) {
  const map = useMap();
  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      if (parcels.length === 0) return;
      const bounds: LatLngBoundsExpression = [
        [Math.min(...parcels.map((p) => p.bbox[1])), Math.min(...parcels.map((p) => p.bbox[0]))],
        [Math.max(...parcels.map((p) => p.bbox[3])), Math.max(...parcels.map((p) => p.bbox[2]))],
      ];
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 18 });
    };
    map.whenReady(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, parcels]);
  return null;
}

export function FieldPickMap({ parcels, onPick }: FieldPickMapProps) {
  const { palette } = useTheme();
  const [layer, setLayer] = useMapLayer();
  const layerConfig = MAP_LAYERS[layer];
  return (
    <Box
      role="region"
      aria-label="Mapa pola. Kliknij działkę na mapie, aby ją dodać."
      sx={{
        position: 'relative',
        width: '100%',
        height: { xs: 380, md: 520 },
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <MapContainer
        center={[52, 19.4]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          key={layer}
          attribution={layerConfig.attribution}
          url={layerConfig.url}
          maxZoom={layerConfig.maxZoom}
        />
        <ClickHandler onPick={onPick} />
        {parcels.map((parcel) => {
          const color = palette.parcel.stroke;
          return (
            <GeoJSON
              key={parcel.id}
              data={parcel.geometry as unknown as GeoJsonObject}
              style={{ color, weight: 3, fillColor: color, fillOpacity: 0.2 }}
            >
              <Tooltip permanent direction="center">
                {parcel.parcelNumber}
              </Tooltip>
            </GeoJSON>
          );
        })}
        <FitToParcels parcels={parcels} />
      </MapContainer>
      <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 1000 }}>
        <MapLayerToggle value={layer} onChange={setLayer} />
      </Box>
    </Box>
  );
}
