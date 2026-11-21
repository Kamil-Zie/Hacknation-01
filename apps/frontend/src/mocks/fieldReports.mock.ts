// API-019 DM-025 Mock of the field report (3 parcels, one failed) and simple parcel outlines for the map
import { ApiError } from '@/api/client';
import type { FieldReport, FieldReportRequest } from '@/api/types';
import { demoReport } from '@/mocks/analyses.mock';
import { MOCK_CROPS } from '@/mocks/crops.mock';

const MOCK_DELAY_MS = 4000;
export const MOCK_FIELD_ID = 'demo';

type Ring = [number, number][];

function rect(minLon: number, minLat: number, maxLon: number, maxLat: number): Ring {
  return [
    [minLon, minLat],
    [maxLon, minLat],
    [maxLon, maxLat],
    [minLon, maxLat],
    [minLon, minLat],
  ];
}

// Three adjacent parcels near Bronowice (shapes are illustrative, ids follow the API-016 example)
const OUTLINES: Record<string, Ring> = {
  '061409_2.0009.612': rect(21.9278, 51.4388, 21.9322, 51.4412),
  '061409_2.0009.613': rect(21.9322, 51.4388, 21.9356, 51.4406),
  '061409_2.0009.614': rect(21.9278, 51.4412, 21.9334, 51.4428),
};

export function mockParcelOutline(parcelId: string): GeoJSON.Polygon | null {
  const ring = OUTLINES[parcelId];
  return ring ? { type: 'Polygon', coordinates: [ring] } : null;
}

const [rec1, rec2, rec3] = demoReport.recommendations;

export function buildMockFieldReport(fieldId: string, body: FieldReportRequest): FieldReport {
  const crop = MOCK_CROPS.find((item) => item.code === body.cropCode) ?? MOCK_CROPS[0];
  if (!crop) throw new ApiError('VALIDATION_ERROR', 'Nieznana uprawa', 422);
  const ids = Object.keys(OUTLINES);
  return {
    fieldId,
    name: 'Pole za stodołą',
    crop: { code: crop.code, name: crop.name },
    analysisDate: body.analysisDate,
    areaHa: 7.9,
    summary: {
      droughtClass: 'severe',
      severeAreaPct: 62.4,
      moderateAreaPct: 24.1,
      rootZonePctWeighted: 41.3,
      deficitMmWeighted: 78.5,
      confidence: 'medium',
    },
    parcels: [
      {
        parcelId: ids[0] as string,
        reportId: 'demo',
        areaHa: 2.41,
        droughtClass: 'severe',
        rootZonePct: 36.2,
        deficitMm: 96.1,
        status: 'complete',
      },
      {
        parcelId: ids[1] as string,
        reportId: 'demo-partial',
        areaHa: 1.87,
        droughtClass: 'moderate',
        rootZonePct: 52.7,
        deficitMm: 54.3,
        status: 'partial',
      },
      {
        parcelId: ids[2] as string,
        reportId: null,
        areaHa: 3.62,
        droughtClass: 'unknown',
        rootZonePct: null,
        deficitMm: null,
        status: 'failed',
        errorMessage: 'Źródło danych o glebie nie odpowiedziało na czas.',
      },
    ],
    recommendations: [
      ...(rec1 ? [{ ...rec1, parcelIds: [ids[0] as string, ids[1] as string] }] : []),
      ...(rec2 ? [{ ...rec2, parcelIds: [ids[0] as string] }] : []),
      ...(rec3 ? [{ ...rec3, parcelIds: [ids[1] as string] }] : []),
    ],
    createdAt: new Date().toISOString(),
  };
}

export async function mockCreateFieldReport(
  fieldId: string,
  body: FieldReportRequest,
): Promise<FieldReport> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  return buildMockFieldReport(fieldId, body);
}
