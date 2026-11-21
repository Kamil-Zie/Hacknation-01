// API-003 DM-004 Mock of GET /crops (same shape as contracts/api.json), ~300 ms delay
import type { CropsResponse } from '@/api/crops';
import type { Crop, CropCode } from '@/api/types';

const MOCK_DELAY_MS = 300;

function makeCrop(
  code: CropCode,
  name: string,
  kcMid: number,
  critical: string,
  category?: string,
): Crop {
  return {
    code,
    category,
    name,
    kcIni: 0.3,
    kcMid,
    kcEnd: 0.4,
    rootDepthM: 1.2,
    depletionFraction: 0.55,
    stages: [
      { code: 'initial', name: 'Wschody', from: '04-01', to: '04-30', isCritical: false },
      { code: 'critical', name: 'Faza krytyczna', from: '05-01', to: '06-30', isCritical: true },
      { code: 'late', name: 'Dojrzewanie', from: '07-01', to: '08-15', isCritical: false },
    ],
    criticalPeriodLabel: critical,
    expectedIndices: [5, 6, 7].map((month) => ({
      month,
      ndviMin: 0.5,
      ndviMax: 0.85,
      ndmiMin: 0.1,
      ndmiMax: 0.4,
    })),
    reference: 'FAO-56 Allen i in. 1998, Tab. 12 i 22',
  };
}

export const MOCK_CROPS: Crop[] = [
  makeCrop(
    'winter_wheat',
    'Pszenica ozima',
    1.15,
    'strzelanie w źdźbło – kwitnienie (maj–czerwiec)',
  ),
  makeCrop(
    'spring_barley',
    'Jęczmień jary',
    1.15,
    'strzelanie w źdźbło – kłoszenie (maj–czerwiec)',
  ),
  makeCrop('maize', 'Kukurydza', 1.2, 'wiechowanie – kwitnienie (lipiec)'),
  makeCrop('potato', 'Ziemniak', 1.15, 'zawiązywanie bulw (czerwiec–lipiec)'),
  makeCrop(
    'winter_rapeseed',
    'Rzepak ozimy',
    1.15,
    'kwitnienie – formowanie łuszczyn (kwiecień–maj)',
  ),
  makeCrop('sugar_beet', 'Burak cukrowy', 1.2, 'rozwój liści i korzenia (czerwiec–sierpień)'),
  makeCrop('grassland', 'Użytki zielone', 0.95, 'intensywny wzrost runi (maj–czerwiec)'),
  // extra crops to exercise grouping and search (codes not yet in CropCode)
  makeCrop('winter_rye' as CropCode, 'Żyto ozime', 1.1, 'kłoszenie (maj)', 'Zboża'),
  makeCrop(
    'field_pea' as CropCode,
    'Groch siewny',
    1.15,
    'kwitnienie (maj–czerwiec)',
    'Strączkowe',
  ),
  makeCrop('apple' as CropCode, 'Jabłoń', 1.2, 'zawiązywanie owoców (czerwiec)', 'Sady i jagodowe'),
  makeCrop('cabbage' as CropCode, 'Kapusta', 1.05, 'zawijanie główek (lipiec)', 'Warzywa'),
];

export async function mockGetCrops(): Promise<CropsResponse> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  return { items: MOCK_CROPS };
}
