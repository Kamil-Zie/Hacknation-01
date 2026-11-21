// T-004 API-006 GET /sources: data source catalog (DM-005) from code
import { SOURCES } from '@/services/sources/catalog';
import type { DataSource } from '@/services/sources/catalog';

export function listSources(): { items: DataSource[] } {
  return { items: SOURCES };
}
