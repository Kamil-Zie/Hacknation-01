// UI-C-007 Source names for evidence lists
import type { Evidence, EvidenceSourceId } from '@/api/types';
import { formatDate, formatNumber } from '@/utils/format';

const SOURCE_LABEL: Record<EvidenceSourceId, string> = {
  uldk: 'Działka',
  meteo: 'Pogoda',
  sentinel2: 'Satelita',
  nasa_power: 'Wilgotność gleby',
  eumetsat: 'Satelita ASCAT',
  soilgrids: 'Gleba',
  elevation: 'Teren',
  overpass: 'Woda w okolicy',
  engine: 'Obliczenie',
};

export function sourceLabel(sourceId: EvidenceSourceId): string {
  return SOURCE_LABEL[sourceId];
}

export function formatEvidence(item: Evidence): string {
  const value =
    typeof item.value === 'number' ? formatNumber(item.value, 1) : (item.value ?? 'brak danych');
  const unit = item.value !== null && item.unit ? ` ${item.unit}` : '';
  return `${item.label}: ${value}${unit} · ${sourceLabel(item.sourceId)} · ${formatDate(item.dataDate)}`;
}
