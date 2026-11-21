// T-017 T-018 API-004 API-005 POST /analyses (geometry, sources, engine per ADR-009, save DM-001) and GET /analyses/:id
import mongoose from 'mongoose';

import { env } from '@/config/env';
import { ReportModel } from '@/models/Report.model';
import { computeEngine } from '@/services/analysis/assessment';
import type { AssessmentDto } from '@/services/analysis/assessment';
import {
  buildDataGaps,
  buildSources,
  hasMissingRequired,
  runSources,
} from '@/services/analysis/sources';
import type { DataGapDto, SourceFetchers, SourceStatusDto } from '@/services/analysis/sources';
import type { Cause } from '@/services/engine/causes';
import { getCrop } from '@/services/engine/crops';
import type { SoilLayer } from '@/services/engine/soil';
import type { Recommendation } from '@/services/engine/recommendations';
import type { VulnerabilityResult } from '@/services/engine/vulnerability';
import { fetchMeteo } from '@/services/sources/meteo.source';
import type { MeteoOutcome } from '@/services/sources/meteo.source';
import type { SourceResult } from '@/services/sources/types';
import { fetchParcelById } from '@/services/sources/uldk.source';
import type { ParcelData } from '@/services/sources/uldk.source';
import { AppError } from '@/utils/AppError';
import { logger } from '@/utils/logger';
import type { CreateAnalysisBody } from '@/validation/analyses.schema';

const METHODOLOGY_VERSION = 'kropla-1.0';
const CONNECTED = 1; // mongoose.connection.readyState

// ADR-007 section 11 (fixed limitations); the ERA5/NASA split and fallback sentences come from the meteo source.
const LIMITATIONS_BEFORE_SPLIT = [
  'Dane pogodowe ERA5 pochodzą z siatki 9–25 km, więc opad na samej działce może się różnić od podanego.',
  'Wilgotność gleby pochodzi z reanalizy ERA5-Land (Copernicus C3S) o siatce ok. 9 km, więc opisuje okolicę działki, a nie samą działkę, i jest modelem z asymilacją obserwacji, a nie pomiarem; ocena (sucho, normalnie, mokro) to percentyl z NASA POWER względem tych samych dni z 10 lat.',
  'Dane glebowe SoilGrids (250 m) to model, a nie pomiar na działce.',
  'Model terenu ma rozdzielczość 90 m i wygładza drobne nierówności.',
  'Zdjęcia Sentinel-2 mają rozdzielczość 10–20 m, a chmury mogą wydłużać czas od ostatniego użytecznego zdjęcia.',
  'Mapa rowów i cieków z OpenStreetMap może być niekompletna.',
];
const LIMITATIONS_AFTER_SPLIT = [
  'Normę wyznaczono z 10 lat, to krótki szereg.',
  'Raport nie zawiera prognozy pogody ani danych o zabiegach i nawadnianiu na działce.',
];

export type ReportDto = {
  id: string;
  parcel: ParcelData & { fetchedAt: string };
  crop: { code: string; name: string };
  analysisDate: string;
  status: 'complete' | 'partial';
  assessment: AssessmentDto;
  vulnerability: Omit<VulnerabilityResult, 'gaps'>;
  causes: Cause[];
  recommendations: Recommendation[];
  sources: SourceStatusDto[];
  limitations: string[];
  dataGaps: DataGapDto[];
  charts: null;
  methodologyVersion: string;
  computedAt: string;
  durationMs: number;
  createdAt: string;
};

type ReportInput = Omit<ReportDto, 'id' | 'computedAt' | 'createdAt'> & {
  computedAt: Date;
  createdAt: Date;
};

// Everything the service reaches outside of itself, so tests run without network and Atlas.
export type AnalysesDeps = {
  fetchParcel: (parcelId: string, signal: AbortSignal) => Promise<SourceResult<ParcelData>>;
  fetchMeteo: (
    lat: number,
    lon: number,
    analysisDate: string,
    signal: AbortSignal,
  ) => Promise<MeteoOutcome>;
  // Sources not listed here are reported as "in preparation" (missing).
  fetchers: SourceFetchers;
  saveReport: (report: ReportInput) => Promise<string>;
  now: () => Date;
  budgetMs: number;
};

export const defaultAnalysesDeps: AnalysesDeps = {
  fetchParcel: (parcelId, signal) => fetchParcelById(parcelId, signal),
  fetchMeteo: (lat, lon, analysisDate, signal) => fetchMeteo(lat, lon, analysisDate, signal),
  fetchers: {},
  saveReport: async (report) => {
    // No database connection: return the report without saving (no waiting for mongoose buffering).
    if (mongoose.connection.readyState !== CONNECTED) {
      logger.warn('report not saved: no database connection');
      return new mongoose.Types.ObjectId().toString();
    }
    const saved = await ReportModel.create(report);
    return saved.id;
  },
  now: () => new Date(),
  budgetMs: env.ANALYSIS_BUDGET_MS,
};

function requireParcel(result: SourceResult<ParcelData>): ParcelData & { fetchedAt: string } {
  if (result.status === 'missing') {
    throw new AppError('PARCEL_NOT_FOUND', 'Nie znaleziono działki', 404);
  }
  if (!result.data) {
    throw new AppError('UPSTREAM_UNAVAILABLE', 'Usługa ULDK GUGiK nie odpowiada', 502);
  }
  return { ...result.data, fetchedAt: (result.fetchedAt ?? new Date()).toISOString() };
}

// Future SoilGrids fetcher returns SoilLayer[] as data.
function soilLayersFrom(result: SourceResult<unknown>): SoilLayer[] | null {
  const isUsable = result.status === 'ok' || result.status === 'cached';
  return isUsable && Array.isArray(result.data) ? (result.data as SoilLayer[]) : null;
}

export async function createAnalysis(
  body: CreateAnalysisBody,
  deps: AnalysesDeps = defaultAnalysesDeps,
): Promise<ReportDto> {
  const startedAt = deps.now();
  const budget = AbortSignal.timeout(deps.budgetMs);

  const crop = getCrop(body.cropCode);
  if (!crop) {
    throw new AppError('VALIDATION_ERROR', 'Nieznana uprawa', 422, { field: 'cropCode' });
  }

  // 1. Geometry from ULDK (cache inside the source); without it there is no analysis.
  const uldk = await deps.fetchParcel(body.parcelId, budget);
  const parcel = requireParcel(uldk);

  // 2. Sources in parallel under the 25 s budget.
  const { lat, lon } = parcel.centroid;
  const context = { parcel, analysisDate: body.analysisDate, signal: budget };
  const run = await runSources(
    context,
    (signal) => deps.fetchMeteo(lat, lon, body.analysisDate, signal),
    deps.fetchers,
  );

  // 3-5. Engine.
  const engine = computeEngine({
    crop,
    analysisDate: body.analysisDate,
    parcel,
    meteo: run.meteo,
    soilLayers: soilLayersFrom(run.extras.soilgrids),
    available: {
      sentinel2: run.extras.sentinel2.status === 'ok' || run.extras.sentinel2.status === 'cached',
      terrain: run.extras.elevation.status === 'ok' || run.extras.elevation.status === 'cached',
      hydrology: run.extras.overpass.status === 'ok' || run.extras.overpass.status === 'cached',
    },
  });

  // 6. Sources, gaps, limitations, status.
  const sources = buildSources(uldk, run, engine.flags.isSoilMoistureFromEra5);
  const dataGaps = buildDataGaps(sources, engine.flags);
  const limitations = [
    ...LIMITATIONS_BEFORE_SPLIT,
    ...run.meteo.limitations,
    ...LIMITATIONS_AFTER_SPLIT,
  ];

  const computedAt = deps.now();
  const report: ReportInput = {
    parcel,
    crop: { code: crop.code, name: crop.name },
    analysisDate: body.analysisDate,
    status: hasMissingRequired(sources) ? 'partial' : 'complete',
    assessment: engine.assessment,
    vulnerability: engine.vulnerability,
    causes: engine.causes,
    recommendations: engine.recommendations,
    sources,
    limitations,
    dataGaps,
    charts: null,
    methodologyVersion: METHODOLOGY_VERSION,
    computedAt,
    durationMs: computedAt.getTime() - startedAt.getTime(),
    createdAt: computedAt,
  };

  // 7. Save; the DTO has `id` as a string and ISO dates.
  const id = await deps.saveReport(report);
  return {
    id,
    ...report,
    computedAt: computedAt.toISOString(),
    createdAt: computedAt.toISOString(),
  };
}

// T-018 API-005: saved report read from the database, no recomputation.
// toJSON maps _id to string id; res.json serializes Date fields to ISO strings.
export type SavedReportDto = Record<string, unknown> & { id: string };

export async function getReportById(id: string): Promise<SavedReportDto> {
  // Without a connection Mongoose would buffer the query for 10 s; fail fast instead.
  if (mongoose.connection.readyState !== 1) {
    throw new AppError('DB_UNAVAILABLE', 'Baza danych jest niedostępna', 503);
  }
  const report = await ReportModel.findById(id);
  if (!report) {
    throw new AppError('REPORT_NOT_FOUND', 'Nie znaleziono raportu', 404);
  }
  return report.toJSON() as unknown as SavedReportDto;
}
