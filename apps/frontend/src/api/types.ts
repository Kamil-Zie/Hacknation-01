// API-001..API-006 Types from contracts/api.json and data_model.json
export type DroughtClass = 'none' | 'moderate' | 'severe' | 'unknown';
export type VulnerabilityClass = 'low' | 'medium' | 'high' | 'unknown';
export type Confidence = 'high' | 'medium' | 'low';
export type Severity = 'low' | 'medium' | 'high';
export type SourceStatusValue = 'ok' | 'cached' | 'missing' | 'error' | 'timeout';
export type SourceId =
  | 'uldk'
  | 'meteo'
  | 'sentinel2'
  | 'era5land'
  | 'nasa_power'
  | 'eumetsat'
  | 'soilgrids'
  | 'elevation'
  | 'overpass';
export type EvidenceSourceId = SourceId | 'engine';
export type SourceCategory = 'spatial' | 'meteo' | 'satellite' | 'soil' | 'terrain' | 'hydro';
export type CropCode =
  | 'winter_wheat'
  | 'spring_barley'
  | 'maize'
  | 'potato'
  | 'winter_rapeseed'
  | 'sugar_beet'
  | 'grassland';
export type ReportStatus = 'complete' | 'partial';
export type CauseCode =
  | 'precip_deficit_heat'
  | 'low_soil_retention'
  | 'surface_runoff'
  | 'crop_water_demand'
  | 'low_vegetation_moisture';
export type RecommendationCategory =
  'retention_landscape' | 'retention_soil' | 'agrotechnics' | 'irrigation';
export type IndexAssessment = 'below' | 'normal' | 'above' | 'unknown';
export type SoilCategory = 'very_light' | 'light' | 'medium' | 'heavy';

export interface LatLon {
  lat: number;
  lon: number;
}

export type Position = [number, number];
export type ParcelGeometry =
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] };

// DM-003
export interface Parcel {
  id: string;
  parcelNumber: string;
  region: string;
  commune: string;
  county: string;
  voivodeship: string;
  areaHa: number;
  centroid: LatLon;
  bbox: [number, number, number, number];
  geometry: ParcelGeometry;
  source: string;
  fetchedAt: string;
}

// DM-004 (API-003)
export interface CropStage {
  code: string;
  name: string;
  from: string;
  to: string;
  isCritical: boolean;
}

export interface Crop {
  code: CropCode;
  name: string;
  kcIni: number;
  kcMid: number;
  kcEnd: number;
  rootDepthM: number;
  depletionFraction: number;
  stages: CropStage[];
  criticalPeriodLabel: string;
  expectedIndices: {
    month: number;
    ndviMin: number;
    ndviMax: number;
    ndmiMin: number;
    ndmiMax: number;
  }[];
  reference: string;
}

// DM-005
export interface DataSource {
  id: SourceId;
  name: string;
  category: SourceCategory;
  label: string;
  provider: string;
  url: string;
  license: string;
  resolution: string;
  timeoutMs: number;
}

// DM-010
export interface Evidence {
  label: string;
  value: number | string | null;
  unit: string | null;
  sourceId: EvidenceSourceId;
  dataDate: string;
  note?: string | null;
}

// DM-013
export interface WaterBalanceWindow {
  days: 30 | 60;
  from: string;
  to: string;
  precipitationMm: number;
  et0Mm: number;
  etcMm: number;
  kbwMm: number;
  normKbwMm: number;
  anomalyMm: number;
  percentile: number;
  precipitationNormPct: number;
  meanTmaxC: number;
  normTmaxC: number;
}

// DM-014
export interface SatelliteObservation {
  sceneId: string;
  sceneDate: string;
  ageDays: number;
  validPixelFraction: number;
  validPixels: number;
  ndvi: number | null;
  ndmi: number | null;
  ndviAssessment: IndexAssessment;
  ndmiAssessment: IndexAssessment;
  expected: { ndviMin: number; ndviMax: number; ndmiMin: number; ndmiMax: number };
  thumbnailUrl?: string | null;
}

// DM-015
export interface SatelliteSoilMoisture {
  label?: string;
  valuePct: number | null;
  rootZonePct?: number | null;
  profilePct?: number | null;
  percentile?: number | null;
  normRootZonePct?: number | null;
  anomalyPp?: number | null;
  assessment: 'dry' | 'normal' | 'wet' | 'unknown';
  agreement: 'confirms' | 'contradicts' | 'neutral';
  observedAt: string;
  ageDays: number;
  product: string;
  collectionId: string;
  granuleId: string | null;
  resolutionKm: number;
  depthLabel: string;
  distanceKm: number | null;
  theta0to7M3?: number | null;
  theta7to28M3?: number | null;
  theta28to100M3?: number | null;
  thetaFcM3?: number | null;
  thetaWpM3?: number | null;
  /** true when the value comes from the NASA POWER fallback instead of ERA5-Land */
  fallback?: boolean;
}

// DM-006
export interface Assessment {
  droughtClass: DroughtClass;
  droughtClassLabel: string;
  isOutOfSeason: boolean;
  confidence: Confidence;
  confidenceScore: number;
  confidenceReasons: string[];
  summary: string;
  kbw30: WaterBalanceWindow | null;
  kbw60: WaterBalanceWindow | null;
  soilWater: {
    tawMm: number;
    rawMm: number;
    depletionMm: number | null;
    isStressed: boolean | null;
  } | null;
  cropStage: { code: string; name: string; kc: number; isCritical: boolean };
  satellite: SatelliteObservation | null;
  soilMoistureSatellite: SatelliteSoilMoisture | null;
  evidence: Evidence[];
}

// DM-007
export interface Vulnerability {
  vulnerabilityClass: VulnerabilityClass;
  vulnerabilityLabel: string;
  yearsAnalyzed: number;
  seasonsWithDeficit: number | null;
  deficitYears: number[];
  criticalMonths: number[];
  criticalMonthsLabel: string | null;
  monthly: { month: number; deficitFrequency: number; medianKbwMm: number }[];
  soil: {
    sandPct: number;
    siltPct: number;
    clayPct: number;
    socPct: number;
    category: SoilCategory;
    categoryLabel: string;
  } | null;
  summary: string;
  evidence: Evidence[];
}

// DM-008
export interface Cause {
  code: CauseCode;
  title: string;
  description: string;
  severity: Severity;
  evidence: Evidence[];
}

// DM-009
export interface Recommendation {
  ruleId: string;
  category: RecommendationCategory;
  order: number;
  priority: Severity;
  title: string;
  action: string;
  where: string | null;
  when: string | null;
  why: string;
  location: LatLon | null;
  irrigation: {
    isJustified: boolean;
    netDoseMm: number | null;
    grossDoseMm: number | null;
    doseM3PerHa: number | null;
    window: string | null;
    nextCheckInDays: number | null;
  } | null;
  evidence: Evidence[];
}

// DM-011
export interface SourceStatus {
  sourceId: SourceId;
  name: string;
  label: string;
  category: SourceCategory;
  provider: string;
  url: string;
  license: string;
  status: SourceStatusValue;
  dataPeriod: string | null;
  fetchedAt: string | null;
  durationMs: number;
  message: string | null;
  role?: 'current' | 'climatology' | 'fallback' | null;
}

// DM-012
export interface DataGap {
  sourceId: SourceId;
  what: string;
  impact: string;
}

// DM-001
export interface Report {
  id: string;
  parcel: Parcel;
  crop: { code: string; name: string };
  analysisDate: string;
  status: ReportStatus;
  assessment: Assessment;
  vulnerability: Vulnerability;
  causes: Cause[];
  recommendations: Recommendation[];
  sources: SourceStatus[];
  limitations: string[];
  dataGaps: DataGap[];
  charts?: {
    kbw60Series: { date: string; kbwMm: number }[];
    kbw60Climatology: { date: string; p10: number; p50: number; p90: number }[];
  } | null;
  methodologyVersion: string;
  computedAt: string;
  durationMs: number;
  createdAt: string;
}

// API-004 request body
export interface AnalysisRequest {
  parcelId: string;
  cropCode: CropCode;
  analysisDate: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
}
