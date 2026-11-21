// T-017 API-004 DM-011 DM-012 Runs the analysis sources in parallel under one budget; builds sources[] and dataGaps[]
import { SOURCES } from '@/services/sources/catalog';
import type { MeteoOutcome } from '@/services/sources/meteo.source';
import type { ParcelData } from '@/services/sources/uldk.source';
import type { SourceId, SourceResult, SourceRole } from '@/services/sources/types';

export type SourceContext = {
  parcel: ParcelData;
  analysisDate: string;
  cropCode: string;
  signal: AbortSignal;
};

// Add a source by registering one function here (see AnalysesDeps.fetchers); until then it is "in preparation".
export type SourceFetcher = (context: SourceContext) => Promise<SourceResult<unknown>>;

export type SourceFetchers = Partial<Record<SourceId, SourceFetcher>>;

export const EXTRA_SOURCE_IDS = ['sentinel2', 'soilgrids', 'elevation', 'overpass'] as const;
type ExtraSourceId = (typeof EXTRA_SOURCE_IDS)[number] | 'eumetsat';

export type SourceRun = {
  meteo: MeteoOutcome;
  extras: Record<ExtraSourceId, SourceResult<unknown>>;
};

export type SourceStatusDto = {
  sourceId: SourceId;
  name: string;
  label: string;
  category: string;
  provider: string;
  url: string;
  license: string;
  status: SourceResult<unknown>['status'];
  dataPeriod: string | null;
  fetchedAt: string | null;
  durationMs: number;
  message: string | null;
  role: SourceRole | null;
};

export type DataGapDto = { sourceId: SourceId; what: string; impact: string };

export type GapContext = {
  hasCurrent: boolean;
  hasClimatology: boolean;
  isClimatologyIncomplete: boolean;
  hasSoilMoisture: boolean;
  isSoilMoistureFromEra5: boolean;
};

const MSG_PENDING = 'Źródło w przygotowaniu';
const MSG_EUMETSAT = 'Źródło opcjonalne, brak dostępu do danych (nie wpływa na wynik)';
const MSG_TIMEOUT = 'Źródło nie odpowiedziało na czas';
const MSG_ERROR = 'Źródło zwróciło błąd';
const MSG_NO_SOIL_MOISTURE = 'Brak danych wilgotności gleby ERA5-Land';

const WHAT: Record<SourceId, string> = {
  uldk: 'Brak geometrii działki',
  meteo: 'Brak danych pogodowych z Open-Meteo',
  sentinel2: 'Brak zdjęcia Sentinel-2',
  era5land: 'Brak wilgotności gleby z ERA5-Land',
  nasa_power: 'Brak wieloletniej klimatologii z NASA POWER (10 lat)',
  eumetsat:
    'Brak niezależnego odczytu radarowego wilgotności gleby (EUMETSAT ASCAT, źródło opcjonalne)',
  soilgrids: 'Brak danych glebowych SoilGrids',
  elevation: 'Brak danych o ukształtowaniu terenu',
  overpass: 'Brak danych o wodach w okolicy (OpenStreetMap)',
};

const STATIC_IMPACT: Partial<Record<SourceId, string>> = {
  sentinel2: 'Nie policzono NDVI i NDMI, więc nie sprawdzono stanu roślin; pewność obniżona',
  soilgrids: 'Nie policzono pojemności wodnej gleby i deficytu glebowego; pewność obniżona',
  elevation: 'Nie oceniono spadku terenu i spływu powierzchniowego; pewność obniżona',
  overpass: 'Nie sprawdzono rowów i zbiorników wodnych w okolicy; pewność obniżona',
  eumetsat:
    'Brak. Wilgotność gleby pochodzi z ERA5-Land, a pewność i status raportu nie zmieniają się',
};

function emptyResult(
  sourceId: SourceId,
  status: SourceResult<unknown>['status'],
  message: string,
): SourceResult<unknown> {
  return {
    sourceId,
    status,
    data: null,
    message,
    fetchedAt: null,
    dataPeriod: null,
    durationMs: 0,
  };
}

// Rejects when the analysis budget runs out, even if the wrapped call ignores the signal.
function raceBudget<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

function failedResult(sourceId: SourceId, signal: AbortSignal): SourceResult<unknown> {
  return signal.aborted
    ? emptyResult(sourceId, 'timeout', MSG_TIMEOUT)
    : emptyResult(sourceId, 'error', MSG_ERROR);
}

function failedMeteo(signal: AbortSignal): MeteoOutcome {
  const status = signal.aborted ? 'timeout' : 'error';
  const message = signal.aborted ? MSG_TIMEOUT : MSG_ERROR;
  return {
    current: { series: [], source: null, fallback: true },
    climatology: null,
    nasaSeries: null,
    confidencePenalty: 0,
    limitations: [],
    sources: [
      { ...emptyResult('meteo', status, message), data: null, role: 'current' },
      { ...emptyResult('nasa_power', status, message), data: null, role: 'climatology' },
    ],
    dataGaps: [],
  };
}

export async function runSources(
  context: SourceContext,
  fetchMeteoFn: (signal: AbortSignal) => Promise<MeteoOutcome>,
  fetchers: SourceFetchers,
): Promise<SourceRun> {
  const { signal } = context;
  const [meteo, extras] = await Promise.all([
    Promise.allSettled([raceBudget(fetchMeteoFn(signal), signal)]),
    Promise.allSettled(
      EXTRA_SOURCE_IDS.map((id) => {
        const fetcher = fetchers[id];
        return fetcher
          ? raceBudget(fetcher(context), signal)
          : Promise.resolve(emptyResult(id, 'missing', MSG_PENDING));
      }),
    ),
  ]);
  const meteoSettled = meteo[0];

  const extraResults = Object.fromEntries(
    EXTRA_SOURCE_IDS.map((id, index) => {
      const settled = extras[index];
      return [id, settled?.status === 'fulfilled' ? settled.value : failedResult(id, signal)];
    }),
  ) as Record<(typeof EXTRA_SOURCE_IDS)[number], SourceResult<unknown>>;

  return {
    meteo: meteoSettled?.status === 'fulfilled' ? meteoSettled.value : failedMeteo(signal),
    // EUMETSAT is optional and always missing (ADR-006): it never changes the report status.
    extras: { ...extraResults, eumetsat: emptyResult('eumetsat', 'missing', MSG_EUMETSAT) },
  };
}

// Result for each source id; era5land is the soil moisture part of the Open-Meteo request.
function resultFor(
  sourceId: SourceId,
  uldk: SourceResult<unknown>,
  run: SourceRun,
  isSoilMoistureFromEra5: boolean,
): SourceResult<unknown> {
  const meteo = run.meteo.sources.find((source) => source.sourceId === 'meteo');
  const nasa = run.meteo.sources.find((source) => source.sourceId === 'nasa_power');
  switch (sourceId) {
    case 'uldk':
      return { ...uldk, role: 'current' };
    case 'meteo':
      return meteo ?? emptyResult('meteo', 'error', MSG_ERROR);
    case 'nasa_power':
      return nasa ?? emptyResult('nasa_power', 'error', MSG_ERROR);
    case 'era5land': {
      if (!meteo) return emptyResult('era5land', 'error', MSG_ERROR);
      const isMeteoOk = meteo.status === 'ok' || meteo.status === 'cached';
      if (isMeteoOk && !isSoilMoistureFromEra5) {
        return { ...emptyResult('era5land', 'missing', MSG_NO_SOIL_MOISTURE), role: 'current' };
      }
      return { ...meteo, sourceId: 'era5land', role: 'current' };
    }
    default:
      return run.extras[sourceId];
  }
}

export function buildSources(
  uldk: SourceResult<unknown>,
  run: SourceRun,
  isSoilMoistureFromEra5: boolean,
): SourceStatusDto[] {
  const nasaFallbackOk = isNasaFallbackOk(resultFor('nasa_power', uldk, run, false));
  return SOURCES.map((source) => {
    const result = resultFor(source.id, uldk, run, isSoilMoistureFromEra5);
    const replaced =
      nasaFallbackOk &&
      COVERED_BY_NASA_FALLBACK.includes(source.id) &&
      result.status !== 'ok' &&
      result.status !== 'cached';
    return {
      sourceId: source.id,
      name: source.name,
      label: source.label,
      category: source.category,
      provider: source.provider,
      url: source.url,
      license: source.license,
      status: result.status,
      dataPeriod: result.dataPeriod?.replace('/', '–') ?? null,
      fetchedAt: result.fetchedAt?.toISOString() ?? null,
      durationMs: result.durationMs,
      message: replaced ? MSG_REPLACED_BY_NASA : result.message,
      role: result.role ?? null,
    };
  });
}

function isAvailable(source: { status: string }): boolean {
  return source.status === 'ok' || source.status === 'cached';
}

// Sources that nasa_power (role fallback, ok/cached) replaces when Open-Meteo fails
// (ADR-008, ADR-009, coordinator decision 13:42; same rule as reportStatus in services/report/sources.ts).
const COVERED_BY_NASA_FALLBACK: SourceId[] = ['meteo', 'era5land'];
const MSG_REPLACED_BY_NASA = 'Zastąpione przez nasa_power (dane zapasowe NASA POWER)';

function isNasaFallbackOk(source: { status: string; role?: string | null }): boolean {
  return source.role === 'fallback' && isAvailable(source);
}

// DM-001: partial when any required source failed; EUMETSAT is optional and ignored;
// meteo and era5land count as covered when nasa_power works as their fallback.
export function hasMissingRequired(sources: SourceStatusDto[]): boolean {
  const nasaFallbackOk = sources.some((s) => s.sourceId === 'nasa_power' && isNasaFallbackOk(s));
  return sources.some(
    (source) =>
      source.sourceId !== 'eumetsat' &&
      !isAvailable(source) &&
      !(nasaFallbackOk && COVERED_BY_NASA_FALLBACK.includes(source.sourceId)),
  );
}

function impactFor(sourceId: SourceId, context: GapContext): string {
  switch (sourceId) {
    case 'meteo':
      return context.hasCurrent
        ? 'Stan bieżący liczony z zapasowego źródła NASA POWER (ok. 50 km), pewność obniżona o 0,05'
        : 'Nie policzono bilansu wodnego, bo brakuje danych pogodowych';
    case 'era5land':
      return context.hasSoilMoisture
        ? 'Wilgotność gleby z zapasowego źródła NASA POWER (ok. 50 km)'
        : 'Nie oceniono wilgotności gleby';
    case 'nasa_power':
      return 'Nie policzono percentyla, anomalii i podatności wieloletniej; raport pokazuje sam stan bieżący, pewność obniżona';
    default:
      return STATIC_IMPACT[sourceId] ?? 'Brak wpływu na wynik';
  }
}

export function buildDataGaps(sources: SourceStatusDto[], context: GapContext): DataGapDto[] {
  const gaps = sources
    .filter((source) => !isAvailable(source) && source.sourceId !== 'uldk')
    .map((source) => ({
      sourceId: source.sourceId,
      what: source.message ? `${WHAT[source.sourceId]} (${source.message})` : WHAT[source.sourceId],
      impact: impactFor(source.sourceId, context),
    }));
  if (context.hasClimatology && context.isClimatologyIncomplete) {
    gaps.push({
      sourceId: 'nasa_power',
      what: 'Za mało pełnych danych z 10 lat do wyznaczenia percentyla',
      impact: impactFor('nasa_power', context),
    });
  }
  return gaps;
}
