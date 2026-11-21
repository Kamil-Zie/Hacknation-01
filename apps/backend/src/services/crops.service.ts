// T-011 API-003 GET /crops: crop table (DM-004) from code
import { CROPS } from '@/services/engine/crops';
import type { Crop } from '@/services/engine/crops';

export function listCrops(): { items: Crop[] } {
  return { items: CROPS };
}
