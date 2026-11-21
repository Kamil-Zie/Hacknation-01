// API-006 DM-005 Mock of GET /sources (same shape as contracts/api.json), ~300 ms delay
import type { SourcesResponse } from '@/api/sources';
import type { DataSource } from '@/api/types';

const MOCK_DELAY_MS = 300;

export const MOCK_SOURCES: DataSource[] = [
  {
    id: 'uldk',
    name: 'ULDK GUGiK',
    category: 'spatial',
    label: 'Działka',
    provider: 'GUGiK',
    url: 'https://uldk.gugik.gov.pl',
    license: 'Dane publiczne',
    resolution: 'granice działki ewidencyjnej',
    timeoutMs: 5000,
  },
  {
    id: 'meteo',
    name: 'Open-Meteo Historical (ERA5)',
    category: 'meteo',
    label: 'Pogoda',
    provider: 'Open-Meteo',
    url: 'https://open-meteo.com',
    license: 'CC BY 4.0',
    resolution: 'siatka 9–25 km',
    timeoutMs: 10000,
  },
  {
    id: 'sentinel2',
    name: 'Sentinel-2 L2A',
    category: 'satellite',
    label: 'Satelita (rośliny)',
    provider: 'Copernicus / ESA',
    url: 'https://dataspace.copernicus.eu',
    license: 'Copernicus open data',
    resolution: '10–20 m',
    timeoutMs: 15000,
  },
  {
    id: 'eumetsat',
    name: 'EUMETSAT ASCAT SSM',
    category: 'satellite',
    label: 'Satelita (wilgotność gleby)',
    provider: 'EUMETSAT',
    url: 'https://data.eumetsat.int',
    license: 'EUMETSAT data policy',
    resolution: '12,5 km',
    timeoutMs: 15000,
  },
  {
    id: 'soilgrids',
    name: 'SoilGrids',
    category: 'soil',
    label: 'Gleba',
    provider: 'ISRIC',
    url: 'https://soilgrids.org',
    license: 'CC BY 4.0',
    resolution: '250 m',
    timeoutMs: 10000,
  },
  {
    id: 'elevation',
    name: 'Open-Meteo Elevation',
    category: 'terrain',
    label: 'Teren',
    provider: 'Open-Meteo',
    url: 'https://open-meteo.com/en/docs/elevation-api',
    license: 'CC BY 4.0',
    resolution: '90 m',
    timeoutMs: 5000,
  },
  {
    id: 'overpass',
    name: 'OpenStreetMap Overpass',
    category: 'hydro',
    label: 'Woda w okolicy',
    provider: 'OpenStreetMap',
    url: 'https://overpass-api.de',
    license: 'ODbL',
    resolution: 'obiekty wodne w promieniu 2 km',
    timeoutMs: 10000,
  },
];

export async function mockGetSources(): Promise<SourcesResponse> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  return { items: MOCK_SOURCES };
}
