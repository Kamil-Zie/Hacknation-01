// UI-C-002 ParcelMap: Leaflet map of Poland (OSM), parcel boundary from GeoJSON, click to pick a parcel
import { Alert, Box, LinearProgress, useTheme } from '@mui/material';
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
import { point } from 'leaflet';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import type { GeoJsonObject } from 'geojson';

import type { Parcel } from '@/api/types';
import { MapLayerToggle } from '@/components/MapLayerToggle/MapLayerToggle';
import { MAP_LAYERS, useMapLayer } from '@/components/MapLayerToggle/mapLayers';

import 'leaflet/dist/leaflet.css';

const POLAND_CENTER: LatLngTuple = [52.0, 19.4];
const POLAND_ZOOM = 6;

const DEFAULT_HEIGHT: MapHeight = { xs: '50vh', md: '60vh', lg: '100%' };
const DEFAULT_MIN_HEIGHT = 280;
const HIGHLIGHT_MS = 1500;

type MapHeight =
  string | number | Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string | number>>;

interface ParcelMapProps {
  parcel: Parcel | null;
  /** Responsive height (MUI sx value). When given, the default 280 px min height is dropped. */
  height?: MapHeight;
  /** Centers the map on a searched place (address search); a new object re-centers again */
  focus?: {
    lat: number;
    lon: number;
    zoom?: number;
    /** [[south, west], [north, east]]: fit the map to this area instead of zooming on the point */
    bounds?: [[number, number], [number, number]];
  } | null;
  /** Changing the value re-fits the map to the parcel and briefly highlights its boundary (0 = never) */
  focusKey?: number;
  markers?: { lat: number; lon: number; label: string }[];
  isInteractive?: boolean;
  /** Mapa / Satelita switch; defaults to isInteractive (off in print) */
  showLayerToggle?: boolean;
  /** T-103: put the Mapa / Satelita switch in the top right corner (default sits lower) */
  layerToggleInCorner?: boolean;
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

function FitToParcel({ parcel, focusKey }: { parcel: Parcel | null; focusKey: number }) {
  const map = useMap();
  useEffect(() => {
    // Recompute size and re-fit after mount and on every container resize,
    // otherwise the parcel ends up cropped when the layout changes (e.g. 360 px)
    const fit = () => {
      map.invalidateSize();
      // No parcel yet: keep Poland centred (the container is resized after mount, e.g. 1920 px layout)
      if (!parcel) {
        map.setView(POLAND_CENTER, POLAND_ZOOM);
        return;
      }
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
  }, [map, parcel, focusKey]);
  return null;
}

function FocusPlace({ focus }: { focus: ParcelMapProps['focus'] }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    // T-103: a found town shows whole (its bounding box), a point keeps the close zoom
    // zoom computed from the bounds + a jump without animation: an animated fitBounds from the
    // Poland view got stuck half-way (old tiles greyed out)
    const zoom = focus.bounds
      ? Math.min(16, map.getBoundsZoom(focus.bounds, false, point(16, 16)))
      : (focus.zoom ?? 16);
    const center: [number, number] = focus.bounds
      ? [
          (focus.bounds[0][0] + focus.bounds[1][0]) / 2,
          (focus.bounds[0][1] + focus.bounds[1][1]) / 2,
        ]
      : [focus.lat, focus.lon];
    map.setView(center, zoom, { animate: false });
  }, [map, focus]);
  return null;
}

export function ParcelMap({
  parcel,
  height,
  focus = null,
  focusKey = 0,
  markers,
  isInteractive = true,
  showLayerToggle = isInteractive,
  layerToggleInCorner = false,
  isLoading = false,
  errorMessage = null,
  onPick,
}: ParcelMapProps) {
  const theme = useTheme();
  const [layer, setLayer] = useMapLayer();
  const layerConfig = MAP_LAYERS[layer];
  const [isHighlighted, setIsHighlighted] = useState(false);
  useEffect(() => {
    if (!focusKey) return;
    setIsHighlighted(true);
    const timer = window.setTimeout(() => setIsHighlighted(false), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [focusKey]);
  const parcelStyle = {
    color: theme.palette.parcel.stroke,
    weight: isHighlighted ? 8 : 3,
    fillColor: theme.palette.parcel.fill,
    fillOpacity: 1, // alpha is already in the rgba fill token
  };
  return (
    <Box
      role="region"
      aria-label={
        parcel ? `Mapa działki ${parcel.parcelNumber}, obręb ${parcel.region}` : 'Mapa działki'
      }
      sx={{
        position: 'relative',
        width: '100%',
        height: height ?? DEFAULT_HEIGHT,
        // Explicit height may be a % of a parent that only has minHeight; keep a floor so it never collapses
        minHeight: height === undefined ? DEFAULT_MIN_HEIGHT : 200,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <MapContainer
        center={POLAND_CENTER}
        zoom={POLAND_ZOOM}
        scrollWheelZoom={isInteractive}
        dragging={isInteractive}
        keyboard={isInteractive}
        doubleClickZoom={isInteractive}
        touchZoom={isInteractive}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          key={layer}
          attribution={layerConfig.attribution}
          url={layerConfig.url}
          maxZoom={layerConfig.maxZoom}
        />
        {isInteractive && <ClickHandler onPick={onPick} />}
        {parcel && (
          <GeoJSON
            key={parcel.id}
            data={parcel.geometry as unknown as GeoJsonObject}
            style={parcelStyle}
          />
        )}
        <FitToParcel parcel={parcel} focusKey={focusKey} />
        <FocusPlace focus={focus} />
        {markers?.map((marker, index) => (
          <CircleMarker
            key={`${marker.lat},${marker.lon}-${index}`}
            center={[marker.lat, marker.lon]}
            radius={8}
          >
            <Tooltip>{marker.label}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      {showLayerToggle && (
        <Box
          sx={{
            position: 'absolute',
            top: layerToggleInCorner ? 12 : { xs: 76, md: 84 },
            right: 12,
            zIndex: 1000,
          }}
        >
          <MapLayerToggle value={layer} onChange={setLayer} />
        </Box>
      )}
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
