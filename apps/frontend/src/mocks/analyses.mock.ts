// API-004 API-005 Mock report (DM-001 shape); TODO(T-003): replace with backend examples from T-003
import type {
  AnalysisRequest,
  Evidence,
  Report,
  SourceStatus,
  WaterBalanceWindow,
} from '@/api/types';

const MS_PER_DAY = 86_400_000;
const SERIES_DAYS = 60;
const CLIMATOLOGY_DAYS = 60;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildSeries(analysisDate: string) {
  const end = new Date(`${analysisDate}T00:00:00Z`).getTime();
  const kbw60Series: { date: string; kbwMm: number }[] = [];
  const kbw60Climatology: { date: string; p10: number; p50: number; p90: number }[] = [];
  for (let i = 0; i < SERIES_DAYS; i += 1) {
    const date = isoDate(new Date(end - (SERIES_DAYS - 1 - i) * MS_PER_DAY));
    kbw60Series.push({ date, kbwMm: Math.round((-10 - i * 0.9 + Math.sin(i / 4) * 6) * 10) / 10 });
  }
  for (let i = 0; i < CLIMATOLOGY_DAYS; i += 1) {
    const date = isoDate(new Date(end - (CLIMATOLOGY_DAYS - 1 - i) * MS_PER_DAY));
    const p50 = -5 - i * 0.45;
    kbw60Climatology.push({
      date,
      p10: Math.round((p50 - 30 - i * 0.3) * 10) / 10,
      p50: Math.round(p50 * 10) / 10,
      p90: Math.round((p50 + 30 + i * 0.2) * 10) / 10,
    });
  }
  return { kbw60Series, kbw60Climatology };
}

function window(days: 30 | 60, kbwMm: number, normKbwMm: number): WaterBalanceWindow {
  return {
    days,
    from: days === 30 ? '2026-04-20' : '2026-03-21',
    to: '2026-05-20',
    precipitationMm: days === 30 ? 21.4 : 58.9,
    et0Mm: days === 30 ? 98.2 : 171.5,
    etcMm: days === 30 ? 104.1 : 190.3,
    kbwMm,
    normKbwMm,
    anomalyMm: Math.round((kbwMm - normKbwMm) * 10) / 10,
    percentile: days === 30 ? 18 : 22,
    precipitationNormPct: days === 30 ? 52 : 68,
    meanTmaxC: days === 30 ? 19.8 : 16.9,
    normTmaxC: days === 30 ? 17.6 : 15.2,
  };
}

function ev(
  label: string,
  value: number | string | null,
  unit: string | null,
  sourceId: Evidence['sourceId'],
  dataDate: string,
): Evidence {
  return { label, value, unit, sourceId, dataDate };
}

function src(
  sourceId: SourceStatus['sourceId'],
  name: string,
  label: string,
  category: SourceStatus['category'],
  provider: string,
  url: string,
  license: string,
  status: SourceStatus['status'],
  dataPeriod: string | null,
  durationMs: number,
  message: string | null,
): SourceStatus {
  return {
    sourceId,
    name,
    label,
    category,
    provider,
    url,
    license,
    status,
    dataPeriod,
    fetchedAt: status === 'ok' || status === 'cached' ? '2026-05-20T08:14:03.000Z' : null,
    durationMs,
    message,
  };
}

const ANALYSIS_DATE = '2026-05-20';

export const demoReport: Report = {
  id: 'demo',
  parcel: {
    id: '141201_1.0001.123',
    parcelNumber: '123',
    region: 'Wólka Kosowska',
    commune: 'Lesznowola',
    county: 'piaseczyński',
    voivodeship: 'mazowieckie',
    areaHa: 4.2,
    centroid: { lat: 52.0725, lon: 20.9185 },
    bbox: [20.915, 52.0705, 20.922, 52.0745],
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [20.915, 52.0705],
          [20.922, 52.0705],
          [20.922, 52.0745],
          [20.915, 52.0745],
          [20.915, 52.0705],
        ],
      ],
    },
    source: 'ULDK GUGiK',
    fetchedAt: '2026-05-20T08:14:01.000Z',
  },
  crop: { code: 'winter_wheat', name: 'Pszenica ozima' },
  analysisDate: ANALYSIS_DATE,
  status: 'partial',
  assessment: {
    droughtClass: 'moderate',
    droughtClassLabel: 'Susza umiarkowana',
    isOutOfSeason: false,
    confidence: 'medium',
    confidenceScore: 0.62,
    confidenceReasons: [
      'Brak danych o wilgotności gleby z satelity (EUMETSAT).',
      'Zdjęcie satelitarne ma 6 dni.',
    ],
    summary:
      'Od 60 dni spadło 59 mm deszczu, czyli 68% normy, a pszenica potrzebowała 190 mm wody. Bilans wody wynosi -131 mm i jest niższy niż w 78% lat.',
    kbw30: window(30, -82.7, -54.3),
    kbw60: window(60, -131.4, -88.6),
    soilWater: { tawMm: 96, rawMm: 48, depletionMm: 61, isStressed: true },
    cropStage: { code: 'stem_elongation', name: 'Strzelanie w źdźbło', kc: 1.1, isCritical: true },
    satellite: {
      sceneId: 'S2B_MSIL2A_20260514T095029_T34UDD',
      sceneDate: '2026-05-14',
      ageDays: 6,
      validPixelFraction: 0.91,
      validPixels: 4180,
      ndvi: 0.58,
      ndmi: 0.12,
      ndviAssessment: 'below',
      ndmiAssessment: 'below',
      expected: { ndviMin: 0.65, ndviMax: 0.85, ndmiMin: 0.2, ndmiMax: 0.4 },
      thumbnailUrl: null,
    },
    soilMoistureSatellite: null,
    evidence: [
      ev('KBW 60 dni', -131.4, 'mm', 'engine', '2026-03-21–2026-05-20'),
      ev('Opad 60 dni', 58.9, 'mm', 'meteo', '2026-03-21–2026-05-20'),
      ev('NDVI', 0.58, null, 'sentinel2', '2026-05-14'),
    ],
  },
  vulnerability: {
    vulnerabilityClass: 'high',
    vulnerabilityLabel: 'Podatność wysoka',
    yearsAnalyzed: 10,
    seasonsWithDeficit: 7,
    deficitYears: [2015, 2016, 2018, 2019, 2020, 2022, 2023],
    criticalMonths: [5, 6, 7],
    criticalMonthsLabel: 'maj–lipiec',
    monthly: [
      { month: 4, deficitFrequency: 0.4, medianKbwMm: -22 },
      { month: 5, deficitFrequency: 0.7, medianKbwMm: -61 },
      { month: 6, deficitFrequency: 0.8, medianKbwMm: -94 },
      { month: 7, deficitFrequency: 0.7, medianKbwMm: -102 },
      { month: 8, deficitFrequency: 0.5, medianKbwMm: -71 },
      { month: 9, deficitFrequency: 0.3, medianKbwMm: -30 },
    ],
    soil: {
      sandPct: 68,
      siltPct: 22,
      clayPct: 10,
      socPct: 1.1,
      category: 'light',
      categoryLabel: 'Gleba lekka',
    },
    summary:
      'W 7 z ostatnich 10 sezonów wystąpił niedobór wody. Najbardziej zagrożone są miesiące maj–lipiec, a gleba lekka zatrzymuje mało wody.',
    evidence: [
      ev('Sezony z niedoborem', '7 z 10', null, 'engine', '2016–2025'),
      ev('Piasek w glebie', 68, '%', 'soilgrids', '2020'),
    ],
  },
  causes: [
    {
      code: 'precip_deficit_heat',
      title: 'Mało deszczu i wysoka temperatura',
      description:
        'Opad w ostatnich 60 dniach to 68% normy, a średnia temperatura maksymalna jest o 1,7°C wyższa niż zwykle.',
      severity: 'high',
      evidence: [ev('Opad względem normy', 68, '%', 'meteo', '2026-03-21–2026-05-20')],
    },
    {
      code: 'low_soil_retention',
      title: 'Gleba zatrzymuje mało wody',
      description: 'Gleba ma 68% piasku i zatrzymuje tylko 96 mm wody w strefie korzeni.',
      severity: 'medium',
      evidence: [ev('Pojemność wodna gleby', 96, 'mm', 'soilgrids', '2020')],
    },
    {
      code: 'crop_water_demand',
      title: 'Duże zapotrzebowanie pszenicy',
      description: 'Pszenica jest w fazie strzelania w źdźbło, gdy zużywa najwięcej wody (Kc 1,1).',
      severity: 'medium',
      evidence: [ev('Kc', 1.1, null, 'engine', '2026-05-20')],
    },
  ],
  recommendations: [
    {
      ruleId: 'R-LAND-01',
      category: 'retention_landscape',
      order: 1,
      priority: 'medium',
      title: 'Zatrzymaj wodę w krajobrazie',
      action: 'Zaplanuj pas zadrzewień lub zakrzewień oraz zastawkę na rowie melioracyjnym.',
      where: 'wzdłuż południowej granicy działki (w dół spadku)',
      when: 'jesienią, po zbiorach',
      why: 'Spadek terenu to 2,4%, a woda spływa powierzchniowo poza działkę.',
      location: { lat: 52.0706, lon: 20.9185 },
      irrigation: null,
      evidence: [ev('Spadek terenu', 2.4, '%', 'elevation', '2026-05-20')],
    },
    {
      ruleId: 'R-SOIL-01',
      category: 'retention_soil',
      order: 2,
      priority: 'high',
      title: 'Zwiększ retencję w glebie',
      action: 'Zostaw resztki pożniwne i dodaj materię organiczną (kompost, obornik).',
      where: null,
      when: 'po zbiorach',
      why: 'Zawartość węgla organicznego to tylko 1,1%, co obniża zdolność gleby do trzymania wody.',
      location: null,
      irrigation: null,
      evidence: [ev('Węgiel organiczny', 1.1, '%', 'soilgrids', '2020')],
    },
    {
      ruleId: 'R-AGRO-01',
      category: 'agrotechnics',
      order: 3,
      priority: 'medium',
      title: 'Ogranicz straty wody z gleby',
      action:
        'Unikaj głębokiej uprawy w suchym okresie i rozważ uprawę bezorkową w kolejnym sezonie.',
      where: null,
      when: 'w następnym sezonie',
      why: 'Bilans wody jest o 43 mm niższy niż mediana z 10 lat.',
      location: null,
      irrigation: null,
      evidence: [ev('Anomalia KBW', -42.8, 'mm', 'engine', '2026-03-21–2026-05-20')],
    },
    {
      ruleId: 'R-IRR-01',
      category: 'irrigation',
      order: 4,
      priority: 'high',
      title: 'Rozważ nawadnianie uzupełniające',
      action: 'Podaj jedną dawkę ok. 25 mm i sprawdź wilgotność gleby po 5 dniach.',
      where: null,
      when: 'w ciągu 3 dni',
      why: 'Deficyt wody w glebie (61 mm) przekracza próg stresu (48 mm) w fazie krytycznej.',
      location: null,
      irrigation: {
        isJustified: true,
        netDoseMm: 25,
        grossDoseMm: 31,
        doseM3PerHa: 310,
        window: 'najbliższe 3 dni, rano lub wieczorem',
        nextCheckInDays: 5,
      },
      evidence: [ev('Deficyt wody w glebie', 61, 'mm', 'engine', '2026-05-20')],
    },
  ],
  sources: [
    src(
      'uldk',
      'ULDK GUGiK',
      'Działka',
      'spatial',
      'GUGiK',
      'https://uldk.gugik.gov.pl',
      'CC BY 4.0',
      'ok',
      null,
      640,
      null,
    ),
    src(
      'meteo',
      'Open-Meteo Historical (ERA5)',
      'Pogoda',
      'meteo',
      'Open-Meteo',
      'https://open-meteo.com',
      'CC BY 4.0',
      'ok',
      '2015-03-08–2026-05-20',
      1820,
      null,
    ),
    src(
      'sentinel2',
      'Sentinel-2 L2A',
      'Satelita (rośliny)',
      'satellite',
      'ESA / Earth Search',
      'https://earth-search.aws.element84.com',
      'Copernicus',
      'cached',
      'scena z 2026-05-14',
      95,
      'Dane z pamięci podręcznej.',
    ),
    src(
      'eumetsat',
      'EUMETSAT ASCAT SSM',
      'Satelita (wilgotność gleby)',
      'satellite',
      'EUMETSAT',
      'https://data.eumetsat.int',
      'EUMETSAT',
      'missing',
      null,
      0,
      'Brak klucza dostępu do EUMETSAT.',
    ),
    src(
      'soilgrids',
      'SoilGrids 2.0',
      'Gleba',
      'soil',
      'ISRIC',
      'https://soilgrids.org',
      'CC BY 4.0',
      'ok',
      '2020',
      1130,
      null,
    ),
    src(
      'elevation',
      'Open-Elevation',
      'Teren',
      'terrain',
      'Open-Elevation',
      'https://open-elevation.com',
      'otwarta',
      'ok',
      null,
      540,
      null,
    ),
    src(
      'overpass',
      'Overpass (OSM)',
      'Woda w okolicy',
      'hydro',
      'OpenStreetMap',
      'https://overpass-api.de',
      'ODbL',
      'timeout',
      null,
      8000,
      'Serwer nie odpowiedział w czasie 8 s.',
    ),
  ],
  limitations: [
    'Wynik jest oceną orientacyjną i nie zastępuje pomiarów polowych.',
    'Rozdzielczość danych pogodowych to siatka ok. 9 km.',
  ],
  dataGaps: [
    {
      sourceId: 'eumetsat',
      what: 'Brak wilgotności gleby z satelity ASCAT',
      impact: 'Nie potwierdzono oceny suszy drugim źródłem; pewność obniżona.',
    },
    {
      sourceId: 'overpass',
      what: 'Brak danych o wodzie w okolicy',
      impact: 'Rekomendacje retencyjne nie uwzględniają pobliskich rowów i cieków.',
    },
  ],
  charts: buildSeries(ANALYSIS_DATE),
  methodologyVersion: 'kropla-1.0',
  computedAt: '2026-05-20T08:14:09.000Z',
  durationMs: 8120,
  createdAt: '2026-05-20T08:14:09.000Z',
};

export function buildMockReport(body: AnalysisRequest): Report {
  return {
    ...demoReport,
    analysisDate: body.analysisDate,
    parcel: { ...demoReport.parcel, id: body.parcelId },
    crop: { code: body.cropCode, name: demoReport.crop.name },
  };
}
