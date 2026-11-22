// T-026 UI-C-001 Address geocoding via OpenStreetMap Nominatim, town type-ahead via Photon (no backend geocoder; map centering only)
export interface GeocodeResult {
  lat: number;
  lon: number;
  label: string;
  /** [[south, west], [north, east]] of the found place, e.g. the whole town */
  bounds?: [[number, number], [number, number]];
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  /** [south, north, west, east] as strings */
  boundingbox?: string[];
}

interface GeocodeOptions {
  /** T-103: only towns and villages (Nominatim featureType=settlement), not streets or POIs */
  settlement?: boolean;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const GEOCODE_TIMEOUT_MS = 10_000;

/** Returns the first match in Poland or null when nothing was found. Throws on network errors. */
export async function geocodeAddress(
  query: string,
  options: GeocodeOptions = {},
): Promise<GeocodeResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  try {
    const params = new URLSearchParams({
      format: 'json',
      countrycodes: 'pl',
      limit: '1',
      q: query,
    });
    if (options.settlement) params.set('featureType', 'settlement');
    const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'pl' },
    });
    if (!response.ok) throw new Error(`Geocoder HTTP ${response.status}`);
    const items = (await response.json()) as NominatimItem[];
    const first = items[0];
    if (!first) return null;
    const lat = Number(first.lat);
    const lon = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const [south, north, west, east] = (first.boundingbox ?? []).map(Number);
    const bounds =
      [south, north, west, east].every((value) => Number.isFinite(value)) &&
      south !== undefined &&
      north !== undefined &&
      west !== undefined &&
      east !== undefined
        ? ([
            [south, west],
            [north, east],
          ] as [[number, number], [number, number]])
        : undefined;
    return { lat, lon, label: first.display_name, bounds };
  } finally {
    clearTimeout(timer);
  }
}

// T-103: type-ahead for towns and villages ("sul" → "Sulnowo, powiat świecki").
// Photon (komoot, OSM data) is built for autocomplete; Nominatim's policy forbids it.
const PHOTON_URL = 'https://photon.komoot.io/api/';
// Poland bounding box (lon/lat); Photon still returns border countries, so we filter by PL
const POLAND_BBOX = '14.07,49.0,24.15,54.84';
// a village without an extent: show the centre close up (zoom 17), where the GUGiK parcel
// boundaries layer starts drawing, so the user can click a parcel right away
const VILLAGE_HALF_SPAN = 0.0008;

export interface PlaceSuggestion {
  id: string;
  name: string;
  /** "powiat świecki, województwo kujawsko-pomorskie" */
  detail: string;
  lat: number;
  lon: number;
  bounds: [[number, number], [number, number]];
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    county?: string;
    state?: string;
    countrycode?: string;
    /** [minLon, maxLat, maxLon, minLat] */
    extent?: [number, number, number, number];
  };
}

export async function suggestPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({ q: query, limit: '15', lang: 'default', bbox: POLAND_BBOX });
  for (const layer of ['city', 'district', 'locality']) params.append('layer', layer);
  const response = await fetch(`${PHOTON_URL}?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Photon HTTP ${response.status}`);
  const data = (await response.json()) as { features?: PhotonFeature[] };
  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];
  for (const feature of data.features ?? []) {
    const p = feature.properties;
    if (p.countrycode !== 'PL' || !p.name) continue;
    const [lon, lat] = feature.geometry.coordinates;
    const detail = [p.county, p.state].filter(Boolean).join(', ');
    const key = `${p.name}|${detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const bounds: [[number, number], [number, number]] = p.extent
      ? [
          [p.extent[3], p.extent[0]],
          [p.extent[1], p.extent[2]],
        ]
      : [
          [lat - VILLAGE_HALF_SPAN, lon - VILLAGE_HALF_SPAN * 1.6],
          [lat + VILLAGE_HALF_SPAN, lon + VILLAGE_HALF_SPAN * 1.6],
        ];
    out.push({
      id: `${p.osm_type ?? ''}${p.osm_id ?? key}`,
      name: p.name,
      detail,
      lat,
      lon,
      bounds,
    });
    if (out.length >= 6) break;
  }
  return out;
}
