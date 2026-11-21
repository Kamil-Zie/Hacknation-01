// T-017 T-018 T-043 API-004 API-005 API-013 POST /analyses (geometry, sources, engine per ADR-009, save DM-001) and GET /analyses/:id
import mongoose from 'mongoose';

import { env } from '@/config/env';
import { ReportModel } from '@/models/Report.model';
import { isMember } from '@/services/accounts.service';
import { computeCharts, computeEngine } from '@/services/analysis/assessment';
import type { AssessmentDto, ChartsDto } from '@/services/analysis/assessment';
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
import { fmt } from '@/services/engine/format';
import type { SatelliteObservation } from '@/services/engine/satellite';
import type { Recommendation } from '@/services/engine/recommendations';
import type { VulnerabilityResult } from '@/services/engine/vulnerability';
import { fetchElevation } from '@/services/sources/elevation.source';
import type { ElevationData } from '@/services/sources/elevation.source';
import { fetchHydrology } from '@/services/sources/overpass.source';
import type { HydroData } from '@/services/sources/overpass.source';
import { fetchMeteo } from '@/services/sources/meteo.source';
import type { MeteoOutcome } from '@/services/sources/meteo.source';
import type { Sentinel2Parcel } from '@/services/sources/sentinel2.source';
import { fetchSatellite } from '@/services/sources/sentinel2Indices';
import { fetchSoilGrids } from '@/services/sources/soilgrids.source';
import type { SourceResult } from '@/services/sources/types';
import { fetchParcelById } from '@/services/sources/uldk.source';
import type { ParcelData } from '@/services/sources/uldk.source';
import { AppError } from '@/utils/AppError';
import { logger } from '@/utils/logger';
import type { AccountReportsQuery, CreateAnalysisBody } from '@/validation/analyses.schema';

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
  accountId: string | null;
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
  charts: ChartsDto | null;
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

// ULDK has its own limit (as in uldk.source); the sources budget is capped so both fit in 38 s.
const PARCEL_TIMEOUT_MS = 20000;
const TOTAL_DEADLINE_MS = 38000;
const MIN_SOURCES_BUDGET_MS = 5000;

export const defaultAnalysesDeps: AnalysesDeps = {
  fetchParcel: (parcelId, signal) => fetchParcelById(parcelId, signal),
  fetchMeteo: (lat, lon, analysisDate, signal) => fetchMeteo(lat, lon, analysisDate, signal),
  fetchers: {
    sentinel2: ({ parcel, analysisDate, cropCode, signal }) =>
      // ULDK returns parcel polygons; the type is the wider GeoJSON Geometry.
      fetchSatellite(parcel as Sentinel2Parcel, analysisDate, cropCode, signal),
    soilgrids: ({ parcel, signal }) =>
      fetchSoilGrids(parcel.centroid.lat, parcel.centroid.lon, signal),
    elevation: ({ parcel, signal }) => fetchElevation(parcel, signal),
    overpass: ({ parcel, signal }) => fetchHydrology(parcel, signal),
  },
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
  if (!result.data && result.status === 'timeout') {
    throw new AppError('UPSTREAM_TIMEOUT', 'Usługa ULDK GUGiK nie odpowiedziała na czas', 504);
  }
  if (!result.data) {
    // T-067: the cause travels with the error (RATE_LIMIT / UPSTREAM_ERROR) so the UI and logs can tell them apart.
    throw new AppError('UPSTREAM_UNAVAILABLE', 'Usługa ULDK GUGiK nie odpowiada', 502, {
      reasonCode: result.reasonCode ?? 'UPSTREAM_ERROR',
    });
  }
  return { ...result.data, fetchedAt: (result.fetchedAt ?? new Date()).toISOString() };
}

function isUsable(result: SourceResult<unknown>): boolean {
  return result.status === 'ok' || result.status === 'cached';
}

// The SoilGrids fetcher returns SoilGridsLayer[] (SoilLayer + siltPct) as data.
function soilLayersFrom(result: SourceResult<unknown>): SoilLayer[] | null {
  return isUsable(result) && Array.isArray(result.data) ? (result.data as SoilLayer[]) : null;
}

function terrainFrom(result: SourceResult<unknown>): ElevationData | null {
  const data = result.data as ElevationData | null;
  return isUsable(result) && data && typeof data.slopePct === 'number' ? data : null;
}

function hydroFrom(result: SourceResult<unknown>): HydroData | null {
  const data = result.data as HydroData | null;
  return isUsable(result) && data && typeof data.hasReservoirWithin1km === 'boolean' ? data : null;
}

function satelliteFrom(result: SourceResult<unknown>): SatelliteObservation | null {
  const data = result.data as SatelliteObservation | null;
  return isUsable(result) && data && typeof data.ndmiAssessment === 'string' ? data : null;
}

export async function createAnalysis(
  body: CreateAnalysisBody,
  deps: AnalysesDeps = defaultAnalysesDeps,
  userId?: string,
): Promise<ReportDto> {
  // Access check first, so a rejected request does not spend the sources budget.
  if (body.accountId) {
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Wymagane zalogowanie.', 401);
    }
    if (!(await isMember(userId, body.accountId))) {
      throw new AppError('NOT_A_MEMBER', 'Nie należysz do tego gospodarstwa.', 403);
    }
  }
  const startedAt = deps.now();

  const crop = getCrop(body.cropCode);
  if (!crop) {
    throw new AppError('VALIDATION_ERROR', 'Nieznana uprawa', 422, { field: 'cropCode' });
  }

  // 1. Geometry from ULDK (cache inside the source) under its own limit; without it there is no analysis.
  const uldkStartedAt = Date.now();
  const uldk = await deps.fetchParcel(body.parcelId, AbortSignal.timeout(PARCEL_TIMEOUT_MS));
  const parcel = requireParcel(uldk);

  // 2. Sources in parallel. The sources budget starts when the geometry arrives, capped so that
  // ULDK time + sources time fits the frontend's 40 s POST timeout (TOTAL_DEADLINE_MS).
  const sourcesBudgetMs = Math.min(
    deps.budgetMs,
    Math.max(MIN_SOURCES_BUDGET_MS, TOTAL_DEADLINE_MS - (Date.now() - uldkStartedAt)),
  );
  const budget = AbortSignal.timeout(sourcesBudgetMs);
  const { lat, lon } = parcel.centroid;
  const context = {
    parcel,
    analysisDate: body.analysisDate,
    cropCode: crop.code,
    signal: budget,
  };
  const run = await runSources(
    context,
    (signal) => deps.fetchMeteo(lat, lon, body.analysisDate, signal),
    deps.fetchers,
  );

  // 3-5. Engine.
  const hydro = hydroFrom(run.extras.overpass);
  const satellite = satelliteFrom(run.extras.sentinel2);
  const engine = computeEngine({
    crop,
    analysisDate: body.analysisDate,
    parcel,
    meteo: run.meteo,
    soilLayers: soilLayersFrom(run.extras.soilgrids),
    terrain: terrainFrom(run.extras.elevation),
    hydro,
    satellite,
    available: {
      sentinel2: satellite !== null,
      hydrology: hydro !== null,
    },
  });

  // 6. Sources, gaps, limitations, status.
  const sources = buildSources(uldk, run, engine.flags.isSoilMoistureFromEra5);
  const dataGaps = buildDataGaps(sources, engine.flags);
  // Scene read but NDMI not computed (Plan B time budget or failed NDMI bands): explicit gap for the UI.
  if (satellite && satellite.ndmi === null) {
    const reason = sources.find((s) => s.sourceId === 'sentinel2')?.message;
    dataGaps.push({
      sourceId: 'sentinel2',
      what: reason ? `Brak wskaźnika NDMI (${reason})` : 'Brak wskaźnika NDMI',
      impact:
        'Nie oceniono wilgotności roślin ze zdjęcia; ocena satelitarna opiera się tylko na NDVI',
    });
  }
  const limitations = [
    ...LIMITATIONS_BEFORE_SPLIT,
    ...(engine.flags.omClipped
      ? [
          `Zawartość materii organicznej z SoilGrids ${fmt(engine.flags.omClipped.originalPct)}% ograniczono do ${fmt(engine.flags.omClipped.usedPct)}%, typowej dla gleb ornych.`,
        ]
      : []),
    ...run.meteo.limitations,
    ...LIMITATIONS_AFTER_SPLIT,
    'Tło wieloletnie liczy parowanie metodą Penmana-Monteitha (FAO-56) z danych NASA POWER o siatce ok. 50 km, więc percentyl i podatność opisują okolicę działki, a nie samą działkę.',
  ];

  const computedAt = deps.now();
  const report: ReportInput = {
    accountId: body.accountId ?? null,
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
    charts: computeCharts(crop, body.analysisDate, run.meteo),
    methodologyVersion: METHODOLOGY_VERSION,
    computedAt,
    durationMs: computedAt.getTime() - startedAt.getTime(),
    createdAt: computedAt,
  };

  // 7. Save; the DTO has `id` as a string and ISO dates. A save failure must not lose the computed
  // report: same shape as without a connection (new ObjectId, nothing stored, GET by id gives 404).
  let id: string;
  try {
    id = await deps.saveReport(report);
  } catch (error) {
    logger.error(`report not saved: ${error instanceof Error ? error.name : 'unknown error'}`);
    id = new mongoose.Types.ObjectId().toString();
  }
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

// T-066: accountId is shown only to an active member of that account, everyone else gets null.
export async function getReportById(id: string, userId?: string): Promise<SavedReportDto> {
  // Without a connection Mongoose would buffer the query for 10 s; fail fast instead.
  if (mongoose.connection.readyState !== 1) {
    throw new AppError('DB_UNAVAILABLE', 'Baza danych jest niedostępna', 503);
  }
  const report = await ReportModel.findById(id);
  if (!report) {
    throw new AppError('REPORT_NOT_FOUND', 'Nie znaleziono raportu', 404);
  }
  const dto = report.toJSON() as unknown as SavedReportDto;
  const accountId = dto.accountId ? String(dto.accountId) : null;
  dto.accountId = accountId && userId && (await isMember(userId, accountId)) ? accountId : null;
  return dto;
}

// T-043 API-013: account history (DM-023 ReportSummary), newest first, projection only.
export type ReportSummaryDto = {
  id: string;
  parcel: { id: string; parcelNumber: string; region: string; commune: string };
  crop: { code: string; name: string };
  analysisDate: string;
  status: 'complete' | 'partial';
  droughtClass: 'none' | 'moderate' | 'severe' | 'unknown';
  createdAt: string;
};

const SUMMARY_PROJECTION = {
  'parcel.id': 1,
  'parcel.parcelNumber': 1,
  'parcel.region': 1,
  'parcel.commune': 1,
  crop: 1,
  analysisDate: 1,
  status: 1,
  'assessment.droughtClass': 1,
  createdAt: 1,
};

type SummaryRow = {
  _id: unknown;
  parcel: ReportSummaryDto['parcel'];
  crop: ReportSummaryDto['crop'];
  analysisDate: string;
  status: ReportSummaryDto['status'];
  assessment?: { droughtClass?: ReportSummaryDto['droughtClass'] };
  createdAt: Date;
};

export async function listAccountReports(
  userId: string,
  accountId: string,
  query: AccountReportsQuery,
): Promise<{ items: ReportSummaryDto[]; page: number; pageSize: number; total: number }> {
  if (!(await isMember(userId, accountId))) {
    throw new AppError('NOT_A_MEMBER', 'Nie należysz do tego gospodarstwa.', 403);
  }
  if (mongoose.connection.readyState !== CONNECTED) {
    throw new AppError('DB_UNAVAILABLE', 'Baza danych jest niedostępna', 503);
  }
  const { page, pageSize } = query;
  const [rows, total] = await Promise.all([
    ReportModel.find({ accountId }, SUMMARY_PROJECTION)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<SummaryRow[]>(),
    ReportModel.countDocuments({ accountId }),
  ]);
  const items = rows.map((row) => ({
    id: String(row._id),
    parcel: {
      id: row.parcel.id,
      parcelNumber: row.parcel.parcelNumber,
      region: row.parcel.region,
      commune: row.parcel.commune,
    },
    crop: { code: row.crop.code, name: row.crop.name },
    analysisDate: row.analysisDate,
    status: row.status,
    droughtClass: row.assessment?.droughtClass ?? 'unknown',
    createdAt: row.createdAt.toISOString(),
  }));
  return { items, page, pageSize, total };
}
