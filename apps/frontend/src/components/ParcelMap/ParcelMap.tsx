// UI-C-002 ParcelMap: Leaflet map of Poland (OSM), parcel boundary from GeoJSON, click to pick a parcel
import { Alert, Box, LinearProgress, useTheme } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
  WMSTileLayer,
} from 'react-leaflet';
import { point } from 'leaflet';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import type { GeoJsonObject } from 'geojson';

import type { Parcel } from '@/api/types';
import { MapLayerToggle } from '@/components/MapLayerToggle/MapLayerToggle';
import { MAP_LAYERS, useMapLayer } from '@/components/MapLayerToggle/mapLayers';
import { groupColor } from '@/utils/groupColors';

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
  /** T-103: parcels chosen for a new field (drawn together, each with its number) */
  selectedParcels?: Parcel[];
  isInteractive?: boolean;
  /** Mapa / Satelita switch; defaults to isInteractive (off in print) */
  showLayerToggle?: boolean;
  /** T-103: put the Mapa / Satelita switch in the top right corner (default sits lower) */
  layerToggleInCorner?: boolean;
  /** T-103: draw cadastral parcel boundaries (GUGiK WMS) from zoom 17 and a "zoom in" hint */
  showParcelBoundaries?: boolean;
  isLoading?: boolean;
  errorMessage?: string | null;
  onPick?: (lat: number, lon: number) => void;
}

const PARCEL_BOUNDARIES_WMS =
  'https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow';

// the GUGiK service returns empty images above about 1:5000, so the layer starts at zoom 17
const BOUNDARIES_MIN_ZOOM = 17;

// reports the map zoom (for the "zoom in to see parcel boundaries" hint)
function ZoomWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => onZoom(map.getZoom()), [map, onZoom]);
  return null;
}

function ClickHandler({ onPick }: { onPick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click: (event) => onPick?.(event.latlng.lat, event.latlng.lng),
  });
  return null;
}

// T-103: true once the user moved the map or a found place was shown; a container resize then only
// recomputes the size instead of snapping back to the parcel (or to all of Poland)
type ViewLock = { current: boolean };

function FitToParcel({
  parcel,
  focusKey,
  viewLock,
}: {
  parcel: Parcel | null;
  focusKey: number;
  viewLock: ViewLock;
}) {
  const map = useMap();
  useEffect(() => {
    viewLock.current = false;
    const container = map.getContainer();
    const lock = () => {
      viewLock.current = true;
    };
    container.addEventListener('pointerdown', lock);
    container.addEventListener('wheel', lock, { passive: true });
    // Recompute size and re-fit after mount and on every container resize,
    // otherwise the parcel ends up cropped when the layout changes (e.g. 360 px)
    const fit = () => {
      map.invalidateSize();
      if (viewLock.current) return;
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
    observer.observe(container);
    return () => {
      observer.disconnect();
      container.removeEventListener('pointerdown', lock);
      container.removeEventListener('wheel', lock);
    };
  }, [map, parcel, focusKey, viewLock]);
  return null;
}

function FocusPlace({ focus, viewLock }: { focus: ParcelMapProps['focus']; viewLock: ViewLock }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    viewLock.current = true;
    // T-103: a found town shows whole (its bounding box), a point keeps the close zoom
    // zoom computed from the bounds + a jump without animation: an animated fitBounds from the
    // Poland view got stuck half-way (old tiles greyed out)
    const zoom = focus.bounds
      ? Math.min(18, map.getBoundsZoom(focus.bounds, false, point(16, 16)))
      : (focus.zoom ?? 16);
    const center: [number, number] = focus.bounds
      ? [
          (focus.bounds[0][0] + focus.bounds[1][0]) / 2,
          (focus.bounds[0][1] + focus.bounds[1][1]) / 2,
        ]
      : [focus.lat, focus.lon];
    map.setView(center, zoom, { animate: false });
  }, [map, focus, viewLock]);
  return null;
}

export function ParcelMap({
  parcel,
  height,
  focus = null,
  focusKey = 0,
  markers,
  selectedParcels,
  isInteractive = true,
  showLayerToggle = isInteractive,
  layerToggleInCorner = false,
  showParcelBoundaries = false,
  isLoading = false,
  errorMessage = null,
  onPick,
}: ParcelMapProps) {
  const theme = useTheme();
  const [layer, setLayer] = useMapLayer();
  const layerConfig = MAP_LAYERS[layer];
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const viewLock = useRef(false);
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
        // group parcel labels: just the coloured number circle, without Leaflet's tooltip box
        '& .group-parcel-label': {
          background: 'transparent',
          border: 0,
          boxShadow: 'none',
          p: 0,
          '&::before': { display: 'none' },
        },
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
        {/* T-103: cadastral parcel boundaries (GUGiK KIEG WMS) from zoom 17, on Mapa and Satelita,
            so the user sees which parcel they are about to click */}
        {showParcelBoundaries && (
          // boundaries only (no numbers); zIndex keeps them above the base map, also after
          // switching Mapa ↔ Satelita (the base layer is re-created then)
          <WMSTileLayer
            url={PARCEL_BOUNDARIES_WMS}
            layers="dzialki"
            format="image/png"
            transparent
            zIndex={10}
            minZoom={BOUNDARIES_MIN_ZOOM}
            maxZoom={layerConfig.maxZoom}
            attribution="Granice działek: GUGiK (KIEG)"
          />
        )}
        {showParcelBoundaries && <ZoomWatcher onZoom={setZoom} />}
        {isInteractive && <ClickHandler onPick={onPick} />}
        {parcel && (
          <GeoJSON
            key={parcel.id}
            data={parcel.geometry as unknown as GeoJsonObject}
            style={parcelStyle}
          />
        )}
        <FitToParcel parcel={parcel} focusKey={focusKey} viewLock={viewLock} />
        <FocusPlace focus={focus} viewLock={viewLock} />
        {/* T-103: each parcel of a group in its own colour, labelled with its number in the list */}
        {selectedParcels?.map((item, index) => {
          const color = groupColor(index);
          return (
            <GeoJSON
              key={`field-${item.id}-${index}`}
              data={item.geometry as unknown as GeoJsonObject}
              interactive={false}
              style={{ color, weight: 4, fillColor: color, fillOpacity: 0.3 }}
            >
              <Tooltip permanent direction="center" opacity={1} className="group-parcel-label">
                <Box
                  component="span"
                  aria-label={`${index + 1}. działka ${item.parcelNumber}`}
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    bgcolor: color,
                    color: '#fff',
                    border: '2px solid #fff',
                    boxShadow: 2,
                    fontWeight: 800,
                    fontSize: '1rem',
                  }}
                >
                  {index + 1}
                </Box>
              </Tooltip>
            </GeoJSON>
          );
        })}
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
      {showParcelBoundaries && zoom !== null && zoom < BOUNDARIES_MIN_ZOOM && (
        <Box
          role="status"
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: 28,
            transform: 'translateX(-50%)',
            zIndex: 1000,
            px: 2,
            py: 1,
            borderRadius: 2,
            bgcolor: 'background.paper',
            color: 'text.primary',
            boxShadow: 3,
            fontSize: '1.125rem',
            fontWeight: 600,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Przybliż mapę, żeby zobaczyć granice działek
        </Box>
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
