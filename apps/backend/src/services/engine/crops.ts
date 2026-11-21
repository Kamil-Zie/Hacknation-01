// T-011 T-076 API-003 DM-004 Crop table (FAO-56 Kc, stages, root depth, p, expected NDVI/NDMI) and helpers for the engine
export type CropCode =
  | 'winter_wheat'
  | 'spring_barley'
  | 'maize'
  | 'potato'
  | 'winter_rapeseed'
  | 'sugar_beet'
  | 'grassland'
  | 'spring_wheat'
  | 'winter_barley'
  | 'rye'
  | 'triticale'
  | 'oats'
  | 'spring_rapeseed'
  | 'maize_silage'
  | 'pea'
  | 'faba_bean'
  | 'lupin'
  | 'soybean'
  | 'carrot'
  | 'onion'
  | 'cabbage'
  | 'strawberry'
  | 'apple'
  | 'alfalfa'
  | 'clover';

export type CropCategory =
  'cereals' | 'oilseeds' | 'root' | 'maize' | 'legumes' | 'vegetables' | 'orchards' | 'grassland';

export type CropStage = {
  code: string;
  name: string;
  from: string;
  to: string;
  isCritical: boolean;
};

export type ExpectedIndices = {
  month: number;
  ndviMin: number;
  ndviMax: number;
  ndmiMin: number;
  ndmiMax: number;
};

export type Crop = {
  code: CropCode;
  name: string;
  category: CropCategory;
  kcIni: number;
  kcMid: number;
  kcEnd: number;
  rootDepthM: number;
  depletionFraction: number;
  stages: CropStage[];
  criticalPeriodLabel: string;
  expectedIndices: ExpectedIndices[];
  reference: string;
};

// ADR-007 §2: outside the growing season the soil is bare/dormant.
export const OUT_OF_SEASON_KC = 0.3;

const REFERENCE = 'FAO-56 Allen i in. 1998, Tab. 12 i 22';
const DAYS_IN_YEAR = 365;
const DAY_MS = 86_400_000;

type IndexRow = [ndviMin: number, ndviMax: number, ndmiMin: number, ndmiMax: number];

// 12 rows (January..December) of [ndviMin, ndviMax, ndmiMin, ndmiMax].
function indices(rows: IndexRow[]): ExpectedIndices[] {
  return rows.map(([ndviMin, ndviMax, ndmiMin, ndmiMax], i) => ({
    month: i + 1,
    ndviMin,
    ndviMax,
    ndmiMin,
    ndmiMax,
  }));
}

// FAO-56 Tab. 12 (Kc ini/mid/end, Zr) and Tab. 22 (p); stage calendar for Poland.
const BASE_CROPS: Crop[] = [
  {
    code: 'winter_wheat',
    name: 'Pszenica ozima',
    category: 'cereals',
    kcIni: 0.4,
    kcMid: 1.15,
    kcEnd: 0.3,
    rootDepthM: 1.2,
    depletionFraction: 0.55,
    stages: [
      {
        code: 'autumn_dormancy',
        name: 'Jesień i spoczynek zimowy',
        from: '10-01',
        to: '03-31',
        isCritical: false,
      },
      {
        code: 'tillering',
        name: 'Krzewienie wiosenne',
        from: '04-01',
        to: '04-30',
        isCritical: false,
      },
      {
        code: 'stem_elongation',
        name: 'Strzelanie w źdźbło',
        from: '05-01',
        to: '05-20',
        isCritical: true,
      },
      {
        code: 'heading_flowering',
        name: 'Kłoszenie i kwitnienie',
        from: '05-21',
        to: '06-20',
        isCritical: true,
      },
      {
        code: 'grain_filling',
        name: 'Nalewanie i dojrzewanie ziarna',
        from: '06-21',
        to: '07-31',
        isCritical: false,
      },
    ],
    criticalPeriodLabel: 'strzelanie w źdźbło – kwitnienie (maj–czerwiec)',
    expectedIndices: indices([
      [0.28, 0.52, 0, 0.24],
      [0.28, 0.52, 0, 0.24],
      [0.38, 0.62, 0.03, 0.27],
      [0.56, 0.8, 0.1, 0.34],
      [0.68, 0.92, 0.18, 0.42],
      [0.65, 0.89, 0.16, 0.4],
      [0.33, 0.57, -0.04, 0.2],
      [0.1, 0.34, -0.12, 0.12],
      [0.13, 0.37, -0.1, 0.14],
      [0.23, 0.47, -0.04, 0.2],
      [0.33, 0.57, 0, 0.24],
      [0.3, 0.54, 0, 0.24],
    ]),
    reference: REFERENCE,
  },
  {
    code: 'spring_barley',
    name: 'Jęczmień jary',
    category: 'cereals',
    kcIni: 0.3,
    kcMid: 1.15,
    kcEnd: 0.25,
    rootDepthM: 1,
    depletionFraction: 0.55,
    stages: [
      {
        code: 'sowing_emergence',
        name: 'Siew i wschody',
        from: '03-25',
        to: '04-30',
        isCritical: false,
      },
      { code: 'tillering', name: 'Krzewienie', from: '05-01', to: '05-15', isCritical: false },
      {
        code: 'stem_elongation_heading',
        name: 'Strzelanie w źdźbło i kłoszenie',
        from: '05-16',
        to: '06-15',
        isCritical: true,
      },
      {
        code: 'grain_filling',
        name: 'Nalewanie i dojrzewanie ziarna',
        from: '06-16',
        to: '07-25',
        isCritical: false,
      },
    ],
    criticalPeriodLabel: 'strzelanie w źdźbło – kłoszenie (maj–czerwiec)',
    expectedIndices: indices([
      [0.05, 0.27, -0.07, 0.17],
      [0.05, 0.27, -0.07, 0.17],
      [0.05, 0.27, -0.09, 0.15],
      [0.18, 0.42, -0.04, 0.2],
      [0.48, 0.72, 0.08, 0.32],
      [0.63, 0.87, 0.16, 0.4],
      [0.38, 0.62, -0.02, 0.22],
      [0.1, 0.34, -0.12, 0.12],
      [0.1, 0.34, -0.12, 0.12],
      [0.13, 0.37, -0.09, 0.15],
      [0.08, 0.32, -0.07, 0.17],
      [0.05, 0.27, -0.07, 0.17],
    ]),
    reference: REFERENCE,
  },
  {
    code: 'maize',
    name: 'Kukurydza na ziarno',
    category: 'maize',
    kcIni: 0.3,
    kcMid: 1.2,
    kcEnd: 0.6,
    rootDepthM: 1.2,
    depletionFraction: 0.55,
    stages: [
      {
        code: 'sowing_emergence',
        name: 'Siew i wschody',
        from: '04-25',
        to: '05-31',
        isCritical: false,
      },
      {
        code: 'vegetative',
        name: 'Wzrost wegetatywny',
        from: '06-01',
        to: '07-05',
        isCritical: false,
      },
      {
        code: 'tasseling_flowering',
        name: 'Wiechowanie i kwitnienie',
        from: '07-06',
        to: '08-05',
        isCritical: true,
      },
      {
        code: 'grain_filling',
        name: 'Nalewanie ziarna',
        from: '08-06',
        to: '08-31',
        isCritical: true,
      },
      { code: 'maturation', name: 'Dojrzewanie', from: '09-01', to: '10-10', isCritical: false },
    ],
    criticalPeriodLabel: 'wiechowanie – nalewanie ziarna (lipiec–sierpień)',
    expectedIndices: indices([
      [0.05, 0.27, -0.09, 0.15],
      [0.05, 0.27, -0.09, 0.15],
      [0.05, 0.27, -0.09, 0.15],
      [0.08, 0.32, -0.08, 0.16],
      [0.18, 0.42, -0.04, 0.2],
      [0.43, 0.67, 0.08, 0.32],
      [0.7, 0.94, 0.2, 0.44],
      [0.68, 0.92, 0.18, 0.42],
      [0.48, 0.72, 0.08, 0.32],
      [0.18, 0.42, -0.04, 0.2],
      [0.06, 0.3, -0.08, 0.16],
      [0.05, 0.27, -0.09, 0.15],
    ]),
    reference: REFERENCE,
  },
  {
    code: 'potato',
    name: 'Ziemniak',
    category: 'root',
    kcIni: 0.5,
    kcMid: 1.15,
    kcEnd: 0.75,
    rootDepthM: 0.5,
    depletionFraction: 0.35,
    stages: [
      {
        code: 'planting_emergence',
        name: 'Sadzenie i wschody',
        from: '04-20',
        to: '05-25',
        isCritical: false,
      },
      {
        code: 'vegetative',
        name: 'Wzrost wegetatywny',
        from: '05-26',
        to: '06-10',
        isCritical: false,
      },
      {
        code: 'tuber_initiation',
        name: 'Zawiązywanie bulw',
        from: '06-11',
        to: '07-05',
        isCritical: true,
      },
      {
        code: 'tuber_bulking',
        name: 'Przyrost bulw',
        from: '07-06',
        to: '08-20',
        isCritical: true,
      },
      { code: 'maturation', name: 'Dojrzewanie', from: '08-21', to: '09-15', isCritical: false },
    ],
    criticalPeriodLabel: 'zawiązywanie i przyrost bulw (czerwiec–sierpień)',
    expectedIndices: indices([
      [0.05, 0.27, -0.09, 0.15],
      [0.05, 0.27, -0.09, 0.15],
      [0.05, 0.27, -0.09, 0.15],
      [0.06, 0.3, -0.08, 0.16],
      [0.23, 0.47, -0.02, 0.22],
      [0.53, 0.77, 0.13, 0.37],
      [0.68, 0.92, 0.2, 0.44],
      [0.6, 0.84, 0.16, 0.4],
      [0.33, 0.57, 0.03, 0.27],
      [0.08, 0.32, -0.07, 0.17],
      [0.05, 0.27, -0.09, 0.15],
      [0.05, 0.27, -0.09, 0.15],
    ]),
    reference: REFERENCE,
  },
  {
    code: 'winter_rapeseed',
    name: 'Rzepak ozimy',
    category: 'oilseeds',
    kcIni: 0.35,
    kcMid: 1.1,
    kcEnd: 0.35,
    rootDepthM: 1.2,
    depletionFraction: 0.6,
    stages: [
      {
        code: 'autumn_dormancy',
        name: 'Jesień i spoczynek zimowy',
        from: '08-25',
        to: '03-14',
        isCritical: false,
      },
      {
        code: 'spring_growth',
        name: 'Wznowienie wegetacji i wzrost pędu',
        from: '03-15',
        to: '04-05',
        isCritical: false,
      },
      { code: 'budding', name: 'Pąkowanie', from: '04-06', to: '04-20', isCritical: true },
      { code: 'flowering', name: 'Kwitnienie', from: '04-21', to: '05-20', isCritical: true },
      {
        code: 'pod_ripening',
        name: 'Dojrzewanie łuszczyn',
        from: '05-21',
        to: '07-15',
        isCritical: false,
      },
    ],
    criticalPeriodLabel: 'pąkowanie – kwitnienie (kwiecień–maj)',
    expectedIndices: indices([
      [0.28, 0.52, -0.02, 0.22],
      [0.28, 0.52, -0.02, 0.22],
      [0.38, 0.62, 0.02, 0.26],
      [0.58, 0.82, 0.12, 0.36],
      [0.66, 0.9, 0.16, 0.4],
      [0.43, 0.67, 0, 0.24],
      [0.18, 0.42, -0.1, 0.14],
      [0.1, 0.34, -0.12, 0.12],
      [0.16, 0.4, -0.1, 0.14],
      [0.33, 0.57, 0, 0.24],
      [0.36, 0.6, 0.02, 0.26],
      [0.3, 0.54, -0.02, 0.22],
    ]),
    reference: REFERENCE,
  },
  {
    code: 'sugar_beet',
    name: 'Burak cukrowy',
    category: 'root',
    kcIni: 0.35,
    kcMid: 1.2,
    kcEnd: 0.7,
    rootDepthM: 0.9,
    depletionFraction: 0.55,
    stages: [
      {
        code: 'sowing_emergence',
        name: 'Siew i wschody',
        from: '04-01',
        to: '05-10',
        isCritical: false,
      },
      { code: 'leaf_growth', name: 'Rozwój liści', from: '05-11', to: '06-30', isCritical: false },
      {
        code: 'canopy_root_growth',
        name: 'Zwarcie rzędów i przyrost korzeni',
        from: '07-01',
        to: '08-31',
        isCritical: true,
      },
      {
        code: 'sugar_accumulation',
        name: 'Gromadzenie cukru',
        from: '09-01',
        to: '10-20',
        isCritical: false,
      },
    ],
    criticalPeriodLabel: 'zwarcie rzędów – przyrost korzeni (lipiec–sierpień)',
    expectedIndices: indices([
      [0.05, 0.27, -0.09, 0.15],
      [0.05, 0.27, -0.09, 0.15],
      [0.05, 0.27, -0.09, 0.15],
      [0.06, 0.3, -0.08, 0.16],
      [0.23, 0.47, -0.02, 0.22],
      [0.5, 0.74, 0.1, 0.34],
      [0.7, 0.94, 0.2, 0.44],
      [0.72, 0.95, 0.22, 0.46],
      [0.66, 0.9, 0.18, 0.42],
      [0.38, 0.62, 0.06, 0.3],
      [0.08, 0.32, -0.07, 0.17],
      [0.05, 0.27, -0.09, 0.15],
    ]),
    reference: REFERENCE,
  },
  {
    code: 'grassland',
    name: 'Użytki zielone',
    category: 'grassland',
    kcIni: 0.4,
    kcMid: 1,
    kcEnd: 0.85,
    rootDepthM: 0.6,
    depletionFraction: 0.6,
    stages: [
      {
        code: 'spring_growth',
        name: 'Wzrost wiosenny',
        from: '03-20',
        to: '04-30',
        isCritical: false,
      },
      {
        code: 'regrowth_after_cuts',
        name: 'Odrost po pokosach',
        from: '05-01',
        to: '08-31',
        isCritical: true,
      },
      {
        code: 'autumn_growth',
        name: 'Wzrost jesienny',
        from: '09-01',
        to: '10-31',
        isCritical: false,
      },
    ],
    criticalPeriodLabel: 'odrost po pokosach (maj–sierpień)',
    expectedIndices: indices([
      [0.33, 0.57, 0, 0.24],
      [0.33, 0.57, 0, 0.24],
      [0.38, 0.62, 0.03, 0.27],
      [0.53, 0.77, 0.1, 0.34],
      [0.66, 0.9, 0.18, 0.42],
      [0.66, 0.9, 0.18, 0.42],
      [0.6, 0.84, 0.14, 0.38],
      [0.58, 0.82, 0.12, 0.36],
      [0.56, 0.8, 0.12, 0.36],
      [0.5, 0.74, 0.08, 0.32],
      [0.4, 0.64, 0.04, 0.28],
      [0.34, 0.58, 0, 0.24],
    ]),
    reference: REFERENCE,
  },
];

// Index rows of the base crops reused as templates for analogous crops.
function indicesOf(code: CropCode): ExpectedIndices[] {
  return BASE_CROPS.find((crop) => crop.code === code)!.expectedIndices;
}

const WINTER_CEREAL_INDICES = indicesOf('winter_wheat');
const SPRING_CEREAL_INDICES = indicesOf('spring_barley');
const MAIZE_INDICES = indicesOf('maize');
const ROOT_INDICES = indicesOf('sugar_beet');
const GRASSLAND_INDICES = indicesOf('grassland');

// Estimate analogous to spring barley, shifted: flowering peak in June, ripening in July-August.
const SPRING_OILSEED_INDICES = indices([
  [0.05, 0.27, -0.09, 0.15],
  [0.05, 0.27, -0.09, 0.15],
  [0.05, 0.27, -0.09, 0.15],
  [0.1, 0.34, -0.08, 0.16],
  [0.35, 0.59, 0.04, 0.28],
  [0.62, 0.86, 0.14, 0.38],
  [0.55, 0.79, 0.1, 0.34],
  [0.2, 0.44, -0.04, 0.2],
  [0.1, 0.34, -0.1, 0.14],
  [0.08, 0.32, -0.08, 0.16],
  [0.05, 0.27, -0.09, 0.15],
  [0.05, 0.27, -0.09, 0.15],
]);

// Estimate analogous to spring barley, shifted for pea, faba bean and lupin (flowering in June).
const LEGUME_INDICES = indices([
  [0.05, 0.27, -0.09, 0.15],
  [0.05, 0.27, -0.09, 0.15],
  [0.05, 0.27, -0.09, 0.15],
  [0.12, 0.36, -0.06, 0.18],
  [0.4, 0.64, 0.06, 0.3],
  [0.65, 0.89, 0.16, 0.4],
  [0.5, 0.74, 0.08, 0.32],
  [0.2, 0.44, -0.06, 0.18],
  [0.1, 0.34, -0.1, 0.14],
  [0.08, 0.32, -0.09, 0.15],
  [0.05, 0.27, -0.09, 0.15],
  [0.05, 0.27, -0.09, 0.15],
]);

// Estimate analogous to maize, shifted: soybean is sown in May and peaks in July-August.
const SOYBEAN_INDICES = indices([
  [0.05, 0.27, -0.09, 0.15],
  [0.05, 0.27, -0.09, 0.15],
  [0.05, 0.27, -0.09, 0.15],
  [0.06, 0.3, -0.08, 0.16],
  [0.1, 0.34, -0.07, 0.17],
  [0.3, 0.54, 0.02, 0.26],
  [0.65, 0.9, 0.16, 0.4],
  [0.7, 0.92, 0.18, 0.42],
  [0.4, 0.64, 0.04, 0.28],
  [0.12, 0.36, -0.06, 0.18],
  [0.05, 0.27, -0.09, 0.15],
  [0.05, 0.27, -0.09, 0.15],
]);

// Estimate analogous to sugar beet, with a lower canopy peak for onion.
const ONION_INDICES = indices([
  [0.05, 0.27, -0.09, 0.15],
  [0.05, 0.27, -0.09, 0.15],
  [0.05, 0.27, -0.09, 0.15],
  [0.06, 0.3, -0.08, 0.16],
  [0.2, 0.44, -0.04, 0.2],
  [0.45, 0.69, 0.06, 0.3],
  [0.55, 0.79, 0.1, 0.34],
  [0.5, 0.74, 0.06, 0.3],
  [0.2, 0.44, -0.04, 0.2],
  [0.08, 0.32, -0.07, 0.17],
  [0.05, 0.27, -0.09, 0.15],
  [0.05, 0.27, -0.09, 0.15],
]);

// Estimate analogous to grassland, with a lower summer canopy for a perennial strawberry plantation.
const STRAWBERRY_INDICES = indices([
  [0.1, 0.3, -0.05, 0.15],
  [0.1, 0.3, -0.05, 0.15],
  [0.1, 0.34, -0.04, 0.2],
  [0.3, 0.54, 0.02, 0.26],
  [0.5, 0.74, 0.08, 0.32],
  [0.55, 0.78, 0.1, 0.34],
  [0.5, 0.74, 0.08, 0.32],
  [0.5, 0.74, 0.08, 0.32],
  [0.4, 0.64, 0.04, 0.28],
  [0.25, 0.5, 0, 0.24],
  [0.15, 0.38, -0.04, 0.2],
  [0.1, 0.3, -0.05, 0.15],
]);

// Estimate analogous to grassland: orchard with grass cover, canopy peak in July-August.
const ORCHARD_INDICES = indices([
  [0.1, 0.3, -0.05, 0.15],
  [0.1, 0.3, -0.05, 0.15],
  [0.12, 0.34, -0.04, 0.18],
  [0.25, 0.5, 0, 0.24],
  [0.5, 0.75, 0.08, 0.32],
  [0.6, 0.85, 0.12, 0.36],
  [0.65, 0.88, 0.14, 0.38],
  [0.65, 0.88, 0.14, 0.38],
  [0.55, 0.8, 0.1, 0.34],
  [0.35, 0.6, 0.04, 0.28],
  [0.15, 0.4, -0.02, 0.2],
  [0.1, 0.3, -0.05, 0.15],
]);

function stage(
  code: string,
  name: string,
  from: string,
  to: string,
  isCritical = false,
): CropStage {
  return { code, name, from, to, isCritical };
}

function winterCerealStages(
  start: string,
  tillering: string,
  stem: string,
  heading: string,
  grain: string,
  end: string,
): CropStage[] {
  return [
    stage('autumn_dormancy', 'Jesień i spoczynek zimowy', start, tillering),
    stage('tillering', 'Krzewienie wiosenne', tillering, stem),
    stage('stem_elongation', 'Strzelanie w źdźbło', stem, heading, true),
    stage('heading_flowering', 'Kłoszenie i kwitnienie', heading, grain, true),
    stage('grain_filling', 'Nalewanie i dojrzewanie ziarna', grain, end),
  ];
}

const SPRING_CEREAL_STAGES: CropStage[] = [
  stage('sowing_emergence', 'Siew i wschody', '04-01', '05-05'),
  stage('tillering', 'Krzewienie', '05-06', '05-20'),
  stage('stem_elongation_heading', 'Strzelanie w źdźbło i kłoszenie', '05-21', '06-20', true),
  stage('grain_filling', 'Nalewanie i dojrzewanie ziarna', '06-21', '07-31'),
];

function legumeStages(sowing: string, podEnd: string): CropStage[] {
  return [
    stage('sowing_emergence', 'Siew i wschody', sowing, '05-10'),
    stage('vegetative', 'Wzrost wegetatywny', '05-11', '05-31'),
    stage('flowering', 'Kwitnienie', '06-01', '06-30', true),
    stage('pod_filling', 'Nalewanie strąków i dojrzewanie', '07-01', podEnd),
  ];
}

const GRASSLAND_STAGES: CropStage[] = [
  stage('spring_growth', 'Wzrost wiosenny', '03-20', '04-30'),
  stage('regrowth_after_cuts', 'Odrost po pokosach', '05-01', '08-31', true),
  stage('autumn_growth', 'Wzrost jesienny', '09-01', '10-31'),
];

// Further crops: FAO-56 Tab. 12 and 22 values; stage calendar for Poland.
const EXTRA_CROPS: Crop[] = [
  {
    code: 'spring_wheat',
    name: 'Pszenica jara',
    category: 'cereals',
    kcIni: 0.3,
    kcMid: 1.15,
    kcEnd: 0.25,
    rootDepthM: 1,
    depletionFraction: 0.55,
    stages: SPRING_CEREAL_STAGES,
    criticalPeriodLabel: 'strzelanie w źdźbło – kłoszenie (maj–czerwiec)',
    expectedIndices: SPRING_CEREAL_INDICES,
    reference: REFERENCE,
  },
  {
    code: 'winter_barley',
    name: 'Jęczmień ozimy',
    category: 'cereals',
    kcIni: 0.4,
    kcMid: 1.15,
    kcEnd: 0.25,
    rootDepthM: 1,
    depletionFraction: 0.55,
    stages: winterCerealStages('09-20', '03-26', '04-26', '05-16', '06-11', '07-15'),
    criticalPeriodLabel: 'strzelanie w źdźbło – kłoszenie (kwiecień–czerwiec)',
    expectedIndices: WINTER_CEREAL_INDICES,
    reference: REFERENCE,
  },
  {
    code: 'rye',
    name: 'Żyto',
    category: 'cereals',
    kcIni: 0.4,
    kcMid: 1.15,
    kcEnd: 0.25,
    rootDepthM: 1.2,
    depletionFraction: 0.55,
    stages: winterCerealStages('09-25', '04-01', '04-26', '05-21', '06-16', '07-25'),
    criticalPeriodLabel: 'strzelanie w źdźbło – kłoszenie (maj–czerwiec)',
    expectedIndices: WINTER_CEREAL_INDICES,
    reference: `${REFERENCE}; zboża drobnoziarniste FAO-56 tab. 12`,
  },
  {
    code: 'triticale',
    name: 'Pszenżyto',
    category: 'cereals',
    kcIni: 0.4,
    kcMid: 1.15,
    kcEnd: 0.25,
    rootDepthM: 1.2,
    depletionFraction: 0.55,
    stages: winterCerealStages('10-01', '04-01', '05-01', '05-21', '06-21', '07-31'),
    criticalPeriodLabel: 'strzelanie w źdźbło – kwitnienie (maj–czerwiec)',
    expectedIndices: WINTER_CEREAL_INDICES,
    reference: `${REFERENCE}; zboża drobnoziarniste FAO-56 tab. 12`,
  },
  {
    code: 'oats',
    name: 'Owies',
    category: 'cereals',
    kcIni: 0.3,
    kcMid: 1.15,
    kcEnd: 0.25,
    rootDepthM: 1,
    depletionFraction: 0.55,
    stages: SPRING_CEREAL_STAGES,
    criticalPeriodLabel: 'strzelanie w źdźbło – wiechowanie (maj–czerwiec)',
    expectedIndices: SPRING_CEREAL_INDICES,
    reference: REFERENCE,
  },
  {
    code: 'spring_rapeseed',
    name: 'Rzepak jary',
    category: 'oilseeds',
    kcIni: 0.35,
    kcMid: 1.1,
    kcEnd: 0.35,
    rootDepthM: 1,
    depletionFraction: 0.6,
    stages: [
      stage('sowing_emergence', 'Siew i wschody', '04-01', '05-15'),
      stage('stem_budding', 'Wzrost pędu i pąkowanie', '05-16', '05-31'),
      stage('flowering', 'Kwitnienie', '06-01', '07-10', true),
      stage('pod_ripening', 'Dojrzewanie łuszczyn', '07-11', '08-20'),
    ],
    criticalPeriodLabel: 'kwitnienie (czerwiec–lipiec)',
    expectedIndices: SPRING_OILSEED_INDICES,
    reference: REFERENCE,
  },
  {
    code: 'maize_silage',
    name: 'Kukurydza na kiszonkę',
    category: 'maize',
    kcIni: 0.3,
    kcMid: 1.2,
    kcEnd: 0.5,
    rootDepthM: 1.2,
    depletionFraction: 0.55,
    stages: [
      stage('sowing_emergence', 'Siew i wschody', '04-25', '05-31'),
      stage('vegetative', 'Wzrost wegetatywny', '06-01', '07-05'),
      stage('tasseling_flowering', 'Wiechowanie i kwitnienie', '07-06', '08-05', true),
      stage('grain_filling', 'Nalewanie ziarna', '08-06', '08-31', true),
      stage('maturation', 'Dojrzałość woskowa', '09-01', '09-15'),
    ],
    criticalPeriodLabel: 'wiechowanie – nalewanie ziarna (lipiec–sierpień)',
    expectedIndices: MAIZE_INDICES,
    reference: `${REFERENCE}; zbiór w fazie woskowej, FAO-56 tab. 12 przypis`,
  },
  {
    code: 'pea',
    name: 'Groch',
    category: 'legumes',
    kcIni: 0.5,
    kcMid: 1.15,
    kcEnd: 0.3,
    rootDepthM: 0.8,
    depletionFraction: 0.35,
    stages: legumeStages('03-25', '07-31'),
    criticalPeriodLabel: 'kwitnienie (czerwiec)',
    expectedIndices: LEGUME_INDICES,
    reference: REFERENCE,
  },
  {
    code: 'faba_bean',
    name: 'Bobik',
    category: 'legumes',
    kcIni: 0.5,
    kcMid: 1.15,
    kcEnd: 0.3,
    rootDepthM: 0.6,
    depletionFraction: 0.45,
    stages: legumeStages('03-25', '08-05'),
    criticalPeriodLabel: 'kwitnienie (czerwiec)',
    expectedIndices: LEGUME_INDICES,
    reference: REFERENCE,
  },
  {
    code: 'lupin',
    name: 'Łubin',
    category: 'legumes',
    kcIni: 0.4,
    kcMid: 1.15,
    kcEnd: 0.35,
    rootDepthM: 0.8,
    depletionFraction: 0.45,
    stages: legumeStages('04-01', '08-10'),
    criticalPeriodLabel: 'kwitnienie (czerwiec)',
    expectedIndices: LEGUME_INDICES,
    reference: `${REFERENCE}; strączkowe na ziarno, analogia FAO-56 tab. 12`,
  },
  {
    code: 'soybean',
    name: 'Soja',
    category: 'legumes',
    kcIni: 0.4,
    kcMid: 1.15,
    kcEnd: 0.5,
    rootDepthM: 1,
    depletionFraction: 0.5,
    stages: [
      stage('sowing_emergence', 'Siew i wschody', '05-01', '06-10'),
      stage('vegetative', 'Wzrost wegetatywny', '06-11', '06-30'),
      stage('flowering_pod_set', 'Kwitnienie i zawiązywanie strąków', '07-01', '08-20', true),
      stage('maturation', 'Dojrzewanie', '08-21', '09-30'),
    ],
    criticalPeriodLabel: 'kwitnienie – zawiązywanie strąków (lipiec–sierpień)',
    expectedIndices: SOYBEAN_INDICES,
    reference: REFERENCE,
  },
  {
    code: 'carrot',
    name: 'Marchew',
    category: 'vegetables',
    kcIni: 0.7,
    kcMid: 1.05,
    kcEnd: 0.95,
    rootDepthM: 0.6,
    depletionFraction: 0.35,
    stages: [
      stage('sowing_emergence', 'Siew i wschody', '04-15', '05-31'),
      stage('leaf_growth', 'Rozwój liści', '06-01', '06-30'),
      stage('root_growth', 'Wzrost korzenia', '07-01', '08-31', true),
      stage('maturation', 'Dojrzewanie', '09-01', '10-15'),
    ],
    criticalPeriodLabel: 'wzrost korzenia (lipiec–sierpień)',
    expectedIndices: ROOT_INDICES,
    reference: REFERENCE,
  },
  {
    code: 'onion',
    name: 'Cebula',
    category: 'vegetables',
    kcIni: 0.7,
    kcMid: 1.05,
    kcEnd: 0.75,
    rootDepthM: 0.4,
    depletionFraction: 0.3,
    stages: [
      stage('planting_emergence', 'Siew lub sadzenie i wschody', '04-10', '05-20'),
      stage('leaf_growth', 'Rozwój liści', '05-21', '06-30'),
      stage('bulb_growth', 'Wzrost cebuli', '07-01', '08-15', true),
      stage('maturation', 'Dojrzewanie', '08-16', '09-10'),
    ],
    criticalPeriodLabel: 'wzrost cebuli (lipiec–sierpień)',
    expectedIndices: ONION_INDICES,
    reference: REFERENCE,
  },
  {
    code: 'cabbage',
    name: 'Kapusta',
    category: 'vegetables',
    kcIni: 0.7,
    kcMid: 1.05,
    kcEnd: 0.95,
    rootDepthM: 0.6,
    depletionFraction: 0.45,
    stages: [
      stage('planting_establishment', 'Sadzenie i ukorzenianie', '05-01', '06-05'),
      stage('leaf_growth', 'Rozwój liści', '06-06', '06-30'),
      stage('head_formation', 'Formowanie główki', '07-01', '08-31', true),
      stage('maturation', 'Dojrzewanie', '09-01', '10-20'),
    ],
    criticalPeriodLabel: 'formowanie główki (lipiec–sierpień)',
    expectedIndices: ROOT_INDICES,
    reference: REFERENCE,
  },
  {
    code: 'strawberry',
    name: 'Truskawka',
    category: 'orchards',
    kcIni: 0.4,
    kcMid: 0.85,
    kcEnd: 0.75,
    rootDepthM: 0.25,
    depletionFraction: 0.2,
    stages: [
      stage('spring_regrowth', 'Wznowienie wegetacji', '03-20', '04-30'),
      stage('flowering_fruiting', 'Kwitnienie i owocowanie', '05-01', '06-30', true),
      stage('post_harvest', 'Regeneracja po zbiorze', '07-01', '08-31'),
      stage('autumn_growth', 'Wzrost jesienny', '09-01', '10-31'),
    ],
    criticalPeriodLabel: 'kwitnienie i owocowanie (maj–czerwiec)',
    expectedIndices: STRAWBERRY_INDICES,
    reference: REFERENCE,
  },
  {
    code: 'apple',
    name: 'Jabłoń (sad z murawą)',
    category: 'orchards',
    kcIni: 0.5,
    kcMid: 1.2,
    kcEnd: 0.95,
    rootDepthM: 1.2,
    depletionFraction: 0.5,
    stages: [
      stage('bud_break', 'Rozwój pąków', '03-25', '04-24'),
      stage('flowering_fruit_set', 'Kwitnienie i zawiązywanie owoców', '04-25', '06-20', true),
      stage('shoot_growth', 'Wzrost pędów', '06-21', '06-30'),
      stage('fruit_growth', 'Wzrost owoców', '07-01', '08-31', true),
      stage('ripening', 'Dojrzewanie owoców', '09-01', '10-15'),
    ],
    criticalPeriodLabel:
      'kwitnienie i zawiązywanie owoców (maj–czerwiec), wzrost owoców (lipiec–sierpień)',
    expectedIndices: ORCHARD_INDICES,
    reference: `${REFERENCE}; Apples, active ground cover, killing frost`,
  },
  {
    code: 'alfalfa',
    name: 'Lucerna',
    category: 'grassland',
    kcIni: 0.4,
    kcMid: 0.95,
    kcEnd: 0.9,
    rootDepthM: 1.2,
    depletionFraction: 0.55,
    stages: GRASSLAND_STAGES,
    criticalPeriodLabel: 'odrost po pokosach (maj–sierpień)',
    expectedIndices: GRASSLAND_INDICES,
    reference: `${REFERENCE}; hay, averaged cutting effects`,
  },
  {
    code: 'clover',
    name: 'Koniczyna',
    category: 'grassland',
    kcIni: 0.4,
    kcMid: 0.9,
    kcEnd: 0.85,
    rootDepthM: 0.8,
    depletionFraction: 0.5,
    stages: GRASSLAND_STAGES,
    criticalPeriodLabel: 'odrost po pokosach (maj–sierpień)',
    expectedIndices: GRASSLAND_INDICES,
    reference: `${REFERENCE}; hay, averaged cutting effects`,
  },
];

export const CROPS: Crop[] = [...BASE_CROPS, ...EXTRA_CROPS];

export function getCrop(code: string): Crop | null {
  return CROPS.find((crop) => crop.code === code) ?? null;
}

// Day of year on a fixed non-leap calendar, so MM-DD stage bounds compare the same every year.
function dayOfYear(monthDay: string): number {
  const [month, day] = monthDay.split('-').map(Number);
  return Math.round((Date.UTC(2001, (month ?? 1) - 1, day ?? 1) - Date.UTC(2001, 0, 1)) / DAY_MS);
}

// Days from `from` to `day` going forward, wrapping over the new year.
function daysSince(from: number, day: number): number {
  return (day - from + DAYS_IN_YEAR) % DAYS_IN_YEAR;
}

function stageIndexForDate(crop: Crop, date: string): number {
  const day = dayOfYear(date.slice(5));
  return crop.stages.findIndex((stage) => {
    const from = dayOfYear(stage.from);
    return daysSince(from, day) <= daysSince(from, dayOfYear(stage.to));
  });
}

export function getStageForDate(crop: Crop, date: string): CropStage | null {
  return crop.stages[stageIndexForDate(crop, date)] ?? null;
}

// ADR-007 §2: Kc constant in the first stage, linear to Kc mid before the first critical stage ends,
// constant (Kc mid) in critical stages, linear to Kc end after them; outside the stages Kc = 0.3.
export function getKcForDate(crop: Crop, date: string): number {
  const index = stageIndexForDate(crop, date);
  const stage = crop.stages[index];
  if (!stage) return OUT_OF_SEASON_KC;
  if (stage.isCritical) return crop.kcMid;
  const firstCritical = crop.stages.findIndex((s) => s.isCritical);
  if (index === 0) return crop.kcIni;
  const from = dayOfYear(stage.from);
  const length = daysSince(from, dayOfYear(stage.to));
  const fraction = length === 0 ? 1 : daysSince(from, dayOfYear(date.slice(5))) / length;
  const [start, end] = index < firstCritical ? [crop.kcIni, crop.kcMid] : [crop.kcMid, crop.kcEnd];
  return Math.round((start + (end - start) * fraction) * 1000) / 1000;
}
