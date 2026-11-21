// T-004 DM-005 DataSource catalog (API-006) with per-source timeout and cache TTL from ADR-006
import type { SourceId } from '@/services/sources/types';

export type DataSource = {
  id: SourceId;
  name: string;
  category: 'spatial' | 'meteo' | 'satellite' | 'soil' | 'terrain' | 'hydro';
  label: string;
  provider: string;
  url: string;
  license: string;
  resolution: string;
  timeoutMs: number;
  attribution?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const SOURCES: DataSource[] = [
  {
    id: 'uldk',
    name: 'ULDK GUGiK (Usługa Lokalizacji Działek Katastralnych)',
    category: 'spatial',
    label: 'Działka',
    provider: 'GUGiK (Główny Urząd Geodezji i Kartografii)',
    url: 'https://uldk.gugik.gov.pl/',
    license: 'Dane PZGiK/EGiB, bezpłatne (Prawo geodezyjne i kartograficzne)',
    resolution: 'działka ewidencyjna (geometria wektorowa)',
    timeoutMs: 10000,
  },
  {
    id: 'meteo',
    name: 'Open-Meteo Historical (ERA5)',
    category: 'meteo',
    label: 'Pogoda',
    provider: 'Open-Meteo (dane ERA5, Copernicus/ECMWF)',
    url: 'https://open-meteo.com/en/docs/historical-weather-api',
    license: 'CC BY 4.0',
    resolution: 'siatka 9–25 km, dane dobowe',
    timeoutMs: 10000,
  },
  {
    id: 'sentinel2',
    name: 'Sentinel-2 L2A (Earth Search STAC)',
    category: 'satellite',
    label: 'Satelita (rośliny)',
    provider: 'ESA Copernicus / Element 84 Earth Search',
    url: 'https://earth-search.aws.element84.com/v1',
    license: 'Copernicus Sentinel (wolna licencja); katalog CC0',
    resolution: '10–20 m',
    timeoutMs: 15000,
  },
  {
    id: 'era5land',
    name: 'ERA5-Land (wilgotność gleby, Copernicus C3S przez Open-Meteo)',
    category: 'soil',
    label: 'Wilgotność gleby',
    provider: 'ECMWF / Copernicus Climate Change Service (dane przez Open-Meteo)',
    url: 'https://open-meteo.com/en/docs/historical-weather-api',
    license: 'CC BY 4.0; wymagane przypisanie Copernicus C3S i Open-Meteo',
    resolution: 'siatka ok. 9 km, warstwy 0–7, 7–28 i 28–100 cm, dane dobowe',
    timeoutMs: 10000,
    attribution:
      'Contains modified Copernicus Climate Change Service information 2026. ERA5-Land data via Open-Meteo.com (CC BY 4.0).',
  },
  {
    id: 'nasa_power',
    name: 'NASA POWER Daily (zapas: reanaliza MERRA-2, meteo i wilgotność gleby)',
    category: 'soil',
    label: 'Wilgotność gleby',
    provider: 'NASA Langley Research Center (LaRC) POWER Project',
    url: 'https://power.larc.nasa.gov/',
    license: 'Dane NASA, otwarte; wymagane przypisanie NASA LaRC POWER',
    resolution: 'siatka ok. 50 km (0,5° × 0,625°), dane dobowe; zapas gdy Open-Meteo zawiedzie',
    timeoutMs: 10000,
    attribution:
      'These data were obtained from the NASA Langley Research Center (LaRC) POWER Project funded through the NASA Earth Science/Applied Science Program.',
  },
  {
    id: 'eumetsat',
    name: 'EUMETSAT ASCAT SSM (Data Store)',
    category: 'satellite',
    label: 'Satelita ASCAT (opcjonalne)',
    provider: 'EUMETSAT / H SAF',
    url: 'https://data.eumetsat.int/',
    license: 'Polityka danych EUMETSAT / H SAF (do potwierdzenia)',
    resolution: '12,5–25 km, warstwa powierzchniowa',
    timeoutMs: 15000,
  },
  {
    id: 'soilgrids',
    name: 'SoilGrids 2.0 (ISRIC, WCS)',
    category: 'soil',
    label: 'Gleba',
    provider: 'ISRIC – World Soil Information',
    url: 'https://maps.isric.org/',
    license: 'CC BY 4.0',
    resolution: '250 m',
    timeoutMs: 8000,
  },
  {
    id: 'elevation',
    name: 'Copernicus DEM GLO-90 (Open-Meteo Elevation)',
    category: 'terrain',
    label: 'Teren',
    provider: 'ESA Copernicus / Open-Meteo',
    url: 'https://open-meteo.com/en/docs/elevation-api',
    license: 'Copernicus DEM (ESA, z atrybucją); Open-Meteo CC BY 4.0',
    resolution: '90 m',
    timeoutMs: 5000,
  },
  {
    id: 'overpass',
    name: 'OpenStreetMap Overpass API',
    category: 'hydro',
    label: 'Woda w okolicy',
    provider: 'OpenStreetMap contributors (Overpass API)',
    url: 'https://overpass-api.de/',
    license: 'ODbL 1.0, © OpenStreetMap contributors',
    resolution: 'dane wektorowe, promień 1 km',
    timeoutMs: 12000,
  },
];

// Default cache TTL per source (ADR-006). Callers may pass a shorter ttlMs for fresh data (meteo, sentinel2).
export const SOURCE_TTL_MS: Record<SourceId, number> = {
  uldk: 30 * DAY_MS,
  meteo: 365 * DAY_MS,
  sentinel2: 365 * DAY_MS,
  era5land: 365 * DAY_MS,
  nasa_power: 365 * DAY_MS,
  eumetsat: 365 * DAY_MS,
  soilgrids: 365 * DAY_MS,
  elevation: 365 * DAY_MS,
  overpass: 30 * DAY_MS,
};

export const SHORT_TTL_MS = {
  meteo: 6 * 60 * 60 * 1000,
  sentinel2: DAY_MS,
  era5land: 6 * 60 * 60 * 1000,
  nasa_power: 6 * 60 * 60 * 1000,
};

export function getSourceTimeoutMs(sourceId: SourceId): number {
  return SOURCES.find((source) => source.id === sourceId)?.timeoutMs ?? 10000;
}
