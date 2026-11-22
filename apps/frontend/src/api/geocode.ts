// T-026 UI-C-001 Address geocoding via OpenStreetMap Nominatim (no backend geocoder; map centering only)
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
