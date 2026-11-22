// API-004 API-005 Mock reports taken verbatim from contracts/api.json → API-004 examples (DM-001 shape)
import type { AnalysisRequest, Report } from '@/api/types';
import { MOCK_CROPS } from '@/mocks/crops.mock';
import { useSelectionStore } from '@/store/selection';

import contract from '../../../../contracts/api.json';

interface ContractEndpoint {
  id: string;
  examples?: Record<string, unknown>;
}

const API_004 = (contract.endpoints as ContractEndpoint[]).find((e) => e.id === 'API-004');
const EXAMPLES = (API_004?.examples ?? {}) as Record<string, Report>;

// Parcel data stays exactly as in the backend example (id, region and geometry must match).
export const demoReport: Report = { ...EXAMPLES['201_complete'], id: 'demo' };
export const demoPartialReport: Report = { ...EXAMPLES['201_partial'], id: 'demo-partial' };

export function findMockReport(id: string): Report | null {
  if (id === demoReport.id) return demoReport;
  if (id === demoPartialReport.id) return demoPartialReport;
  // account parcels mock (API-020) links its latest reports as mock_report_N
  if (id.startsWith('mock_report_')) return { ...demoReport, id };
  return null;
}

export function buildMockReport(body: AnalysisRequest): Report {
  const selected = useSelectionStore.getState().parcel;
  const parcel =
    selected && selected.id === body.parcelId
      ? selected
      : { ...demoReport.parcel, id: body.parcelId };
  const cropName = MOCK_CROPS.find((c) => c.code === body.cropCode)?.name ?? demoReport.crop.name;
  return {
    ...demoReport,
    analysisDate: body.analysisDate,
    parcel,
    crop: { code: body.cropCode, name: cropName },
  };
}
