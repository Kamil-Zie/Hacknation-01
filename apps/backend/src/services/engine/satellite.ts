// T-028 DM-014 DM-004 Satellite indices vs crop expectations for the month of D (ADR-007 §5)
import { getCrop } from '@/services/engine/crops';

export type IndexAssessment = 'below' | 'normal' | 'above' | 'unknown';

export type SatelliteExpected = {
  ndviMin: number;
  ndviMax: number;
  ndmiMin: number;
  ndmiMax: number;
};

export type SatelliteAssessment = {
  ndviAssessment: IndexAssessment;
  ndmiAssessment: IndexAssessment;
  expected: SatelliteExpected;
};

// DM-014 SatelliteObservation.
export type SatelliteObservation = SatelliteAssessment & {
  sceneId: string;
  sceneDate: string;
  ageDays: number;
  validPixelFraction: number;
  validPixels: number;
  ndvi: number | null;
  ndmi: number | null;
  thumbnailUrl: string | null;
};

function assess(value: number | null, min: number, max: number): IndexAssessment {
  if (value === null) return 'unknown';
  if (value < min) return 'below';
  return value > max ? 'above' : 'normal';
}

// Compares NDVI/NDMI with the crop's expected range for the month of the analysis date.
export function assessSatellite(
  indices: { ndvi: number | null; ndmi: number | null },
  cropCode: string,
  analysisDate: string,
): SatelliteAssessment {
  const crop = getCrop(cropCode);
  if (!crop) throw new Error(`Unknown crop: ${cropCode}`);
  const month = Number(analysisDate.slice(5, 7));
  const row = crop.expectedIndices.find((entry) => entry.month === month);
  if (!row) throw new Error(`No expected indices for month ${month}`);
  const expected = {
    ndviMin: row.ndviMin,
    ndviMax: row.ndviMax,
    ndmiMin: row.ndmiMin,
    ndmiMax: row.ndmiMax,
  };
  return {
    ndviAssessment: assess(indices.ndvi, expected.ndviMin, expected.ndviMax),
    ndmiAssessment: assess(indices.ndmi, expected.ndmiMin, expected.ndmiMax),
    expected,
  };
}
