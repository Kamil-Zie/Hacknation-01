// API-006 DM-005 Mock of GET /sources taken verbatim from contracts/api.json → API-006 examples, ~300 ms delay
import type { SourcesResponse } from '@/api/sources';
import type { DataSource } from '@/api/types';

import contract from '../../../../contracts/api.json';

const MOCK_DELAY_MS = 300;

interface ContractEndpoint {
  id: string;
  examples?: Record<string, unknown>;
}

const API_006 = (contract.endpoints as ContractEndpoint[]).find((e) => e.id === 'API-006');
const EXAMPLE = API_006?.examples?.['200'] as SourcesResponse | undefined;

// Follows the contract automatically (era5land, nasa_power, eumetsat …) when backend updates it
export const MOCK_SOURCES: DataSource[] = EXAMPLE?.items ?? [];

export async function mockGetSources(): Promise<SourcesResponse> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  return { items: MOCK_SOURCES };
}
