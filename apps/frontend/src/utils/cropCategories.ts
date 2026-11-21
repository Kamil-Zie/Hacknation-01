// API-003 DM-004 Crop categories (Polish section names, order) and mapping of a crop to its category
import type { Crop } from '@/api/types';

export const CROP_CATEGORY_ORDER = [
  'Zboża',
  'Oleiste',
  'Okopowe',
  'Kukurydza',
  'Strączkowe',
  'Warzywa',
  'Sady i jagodowe',
  'Użytki zielone',
  'Inne',
] as const;

const FALLBACK_CATEGORY = 'Inne';

// API category codes (when backend sends codes instead of Polish names)
const API_CATEGORY_NAMES: Record<string, string> = {
  cereals: 'Zboża',
  cereal: 'Zboża',
  oilseeds: 'Oleiste',
  oilseed: 'Oleiste',
  root_crops: 'Okopowe',
  roots: 'Okopowe',
  maize: 'Kukurydza',
  corn: 'Kukurydza',
  legumes: 'Strączkowe',
  pulses: 'Strączkowe',
  vegetables: 'Warzywa',
  orchards: 'Sady i jagodowe',
  orchard: 'Sady i jagodowe',
  fruit: 'Sady i jagodowe',
  berries: 'Sady i jagodowe',
  grassland: 'Użytki zielone',
  grasslands: 'Użytki zielone',
  other: 'Inne',
};

const CODE_CATEGORIES: Record<string, string> = {
  winter_wheat: 'Zboża',
  spring_barley: 'Zboża',
  winter_rapeseed: 'Oleiste',
  potato: 'Okopowe',
  sugar_beet: 'Okopowe',
  maize: 'Kukurydza',
  grassland: 'Użytki zielone',
};

export function cropCategory(crop: { code: string; category?: string }): string {
  if (crop.category) {
    const fromApi = API_CATEGORY_NAMES[crop.category.toLowerCase()] ?? crop.category;
    if ((CROP_CATEGORY_ORDER as readonly string[]).includes(fromApi)) return fromApi;
  }
  return CODE_CATEGORIES[crop.code] ?? FALLBACK_CATEGORY;
}

/** Lowercase and strip Polish diacritics so "pszen" matches "Pszenica" and "zyto" matches "Żyto" */
export function normalizeSearch(text: string): string {
  return text.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export function groupCropsByCategory(crops: Crop[]): { category: string; crops: Crop[] }[] {
  return CROP_CATEGORY_ORDER.map((category) => ({
    category,
    crops: crops.filter((crop) => cropCategory(crop) === category),
  })).filter((group) => group.crops.length > 0);
}
