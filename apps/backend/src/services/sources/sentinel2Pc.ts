// T-039 DM-014 Sentinel-2 L2A from Microsoft Planetary Computer: STAC search mapped to the Earth Search shape + anonymous SAS signing
import { HttpStatusError } from '@/services/sources/runSource';

export const PC_SEARCH_URL = 'https://planetarycomputer.microsoft.com/api/stac/v1/search';
export const PC_TOKEN_URL =
  'https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a';
const PC_BLOB_HOST_SUFFIX = '.blob.core.windows.net';
// A token is reused until 5 minutes before msft:expiry.
const TOKEN_MARGIN_MS = 5 * 60 * 1000;
// Without msft:expiry in the response, the token is reused for a short while only.
const TOKEN_FALLBACK_MS = 10 * 60 * 1000;
const SCALE = 0.0001;
// Processing baseline >= 04.00 adds BOA_ADD_OFFSET = -1000 DN (-0.1 reflectance).
const OFFSET_BASELINE_04 = -0.1;

type PcAsset = { href?: unknown };
type PcFeature = {
  properties?: Record<string, unknown>;
  assets?: Record<string, PcAsset | undefined>;
} & Record<string, unknown>;

type CachedToken = { token: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

export function resetPcTokenCache(): void {
  cachedToken = null;
}

// Anonymous SAS token for the sentinel-2-l2a collection, cached in memory until expiry minus 5 min.
export async function getPcToken(
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > now()) return cachedToken.token;
  const response = await fetchImpl(PC_TOKEN_URL, { signal });
  if (!response.ok) throw new HttpStatusError(response.status);
  const body = (await response.json()) as { token?: unknown; 'msft:expiry'?: unknown };
  if (typeof body.token !== 'string' || !body.token) throw new Error('Malformed SAS response');
  const expiry =
    typeof body['msft:expiry'] === 'string' ? Date.parse(body['msft:expiry']) : Number.NaN;
  const expiresAt =
    (Number.isFinite(expiry) ? expiry : now() + TOKEN_FALLBACK_MS) - TOKEN_MARGIN_MS;
  cachedToken = { token: body.token, expiresAt };
  return body.token;
}

export function isPcHref(href: string): boolean {
  try {
    return new URL(href).hostname.endsWith(PC_BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

// Appends the SAS token as the query string of a blob href.
export function signPcHref(href: string, token: string): string {
  return `${href}${href.includes('?') ? '&' : '?'}${token}`;
}

// Baseline "04.00" and later (N0400, N0512) carry the -1000 DN offset.
function reflectanceOffset(properties: Record<string, unknown> | undefined): number {
  const baseline = properties?.['s2:processing_baseline'];
  const major = typeof baseline === 'string' ? Number.parseFloat(baseline) : Number.NaN;
  return Number.isFinite(major) && major < 4 ? 0 : OFFSET_BASELINE_04;
}

function scaled(asset: PcAsset | undefined, offset: number): Record<string, unknown> | undefined {
  return asset ? { href: asset.href, 'raster:bands': [{ scale: SCALE, offset }] } : undefined;
}

// Renames PC assets (B04, B08, B8A, B11, SCL) to the Earth Search keys that parseScene reads.
export function toEarthSearchShape(feature: PcFeature): PcFeature {
  const { assets, properties } = feature;
  const offset = reflectanceOffset(properties);
  return {
    ...feature,
    assets: {
      red: scaled(assets?.B04, offset),
      nir: scaled(assets?.B08, offset),
      nir08: scaled(assets?.B8A, offset),
      swir16: scaled(assets?.B11, offset),
      scl: assets?.SCL,
      thumbnail: assets?.rendered_preview,
    },
  };
}
