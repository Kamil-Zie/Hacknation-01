// T-011 DM-004 Crop table (FAO-56 Kc, stages, root depth, p, expected NDVI/NDMI) and helpers for the engine
export type CropCode =
  | 'winter_wheat'
  | 'spring_barley'
  | 'maize'
  | 'potato'
  | 'winter_rapeseed'
  | 'sugar_beet'
  | 'grassland';

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
export const CROPS: Crop[] = [
  {
    code: 'winter_wheat',
    name: 'Pszenica ozima',
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
