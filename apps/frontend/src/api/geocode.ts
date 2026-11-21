// T-026 UI-C-001 Address geocoding via OpenStreetMap Nominatim (no backend geocoder; map centering only)
export interface GeocodeResult {
  lat: number;
  lon: number;
  label: string;
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const GEOCODE_TIMEOUT_MS = 10_000;

/** Returns the first match in Poland or null when nothing was found. Throws on network errors. */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  try {
    const params = new URLSearchParams({
      format: 'json',
      countrycodes: 'pl',
      limit: '1',
      q: query,
    });
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
    return { lat, lon, label: first.display_name };
  } finally {
    clearTimeout(timer);
  }
}
