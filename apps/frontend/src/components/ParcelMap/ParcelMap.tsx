// UI-C-002 ParcelMap: Leaflet map of Poland (OSM), parcel boundary from GeoJSON, click to pick a parcel
import { Alert, Box, LinearProgress } from '@mui/material';
import { useEffect } from 'react';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import type { GeoJsonObject } from 'geojson';

import type { Parcel } from '@/api/types';

import 'leaflet/dist/leaflet.css';

const POLAND_CENTER: LatLngTuple = [52.0, 19.4];
const POLAND_ZOOM = 6;
const PARCEL_STYLE = { color: '#1F6FB2', weight: 3, fillColor: '#1F6FB2', fillOpacity: 0.15 };

const DEFAULT_HEIGHT: MapHeight = { xs: '50vh', md: '60vh', lg: '100%' };
const DEFAULT_MIN_HEIGHT = 280;

type MapHeight =
  string | number | Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string | number>>;

interface ParcelMapProps {
  parcel: Parcel | null;
  /** Responsive height (MUI sx value). When given, the default 280 px min height is dropped. */
  height?: MapHeight;
  markers?: { lat: number; lon: number; label: string }[];
  isInteractive?: boolean;
  isLoading?: boolean;
  errorMessage?: string | null;
  onPick?: (lat: number, lon: number) => void;
}

function ClickHandler({ onPick }: { onPick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click: (event) => onPick?.(event.latlng.lat, event.latlng.lng),
  });
  return null;
}

function FitToParcel({ parcel }: { parcel: Parcel | null }) {
  const map = useMap();
  useEffect(() => {
    // Recompute size and re-fit after mount and on every container resize,
    // otherwise the parcel ends up cropped when the layout changes (e.g. 360 px)
    const fit = () => {
      map.invalidateSize();
      if (!parcel) return;
      const [minLon, minLat, maxLon, maxLat] = parcel.bbox;
      const bounds: LatLngBoundsExpression = [
        [minLat, minLon],
        [maxLat, maxLon],
      ];
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 18 });
    };
    map.whenReady(fit);
    const observer = new ResizeObserver(() => fit());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, parcel]);
  return null;
}

export function ParcelMap({
  parcel,
  height,
  markers,
  isInteractive = true,
  isLoading = false,
  errorMessage = null,
  onPick,
}: ParcelMapProps) {
  return (
    <Box
      role="region"
      aria-label="Mapa działki"
      sx={{
        position: 'relative',
        width: '100%',
        height: height ?? DEFAULT_HEIGHT,
        minHeight: height === undefined ? DEFAULT_MIN_HEIGHT : undefined,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <MapContainer
        center={POLAND_CENTER}
        zoom={POLAND_ZOOM}
        scrollWheelZoom={isInteractive}
        dragging={isInteractive}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {isInteractive && <ClickHandler onPick={onPick} />}
        {parcel && (
          <GeoJSON
            key={parcel.id}
            data={parcel.geometry as unknown as GeoJsonObject}
            style={PARCEL_STYLE}
          />
        )}
        <FitToParcel parcel={parcel} />
        {markers?.map((marker) => (
          <CircleMarker
            key={`${marker.lat},${marker.lon}`}
            center={[marker.lat, marker.lon]}
            radius={8}
          >
            <Tooltip>{marker.label}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      {isLoading && (
        <LinearProgress
          aria-label="Ładowanie działki"
          sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}
        />
      )}
      {errorMessage && (
        <Alert
          severity="warning"
          sx={{ position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 1000 }}
        >
          {errorMessage}
        </Alert>
      )}
    </Box>
  );
}
