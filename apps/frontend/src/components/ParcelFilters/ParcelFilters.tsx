// UI-C-019 ParcelFilters: checkbox groups (area, locality, crop) and client-side filtering of account parcels [T-088]
import { Box, Button, Checkbox, FormControlLabel, FormGroup, Typography } from '@mui/material';

import type { ParcelOverview } from '@/api/types';

export const NO_REPORT = '__no_report__';
export const AREA_THRESHOLDS = [1, 5, 10] as const;

export interface Filters {
  /** area thresholds in ha (parcel must be above the smallest selected one) */
  areas: number[];
  /** locality keys, see localityKey() */
  localities: string[];
  /** crop names or NO_REPORT */
  crops: string[];
}

export const EMPTY_FILTERS: Filters = { areas: [], localities: [], crops: [] };

export function localityKey(item: ParcelOverview): string {
  return `${item.parcel.region} (${item.parcel.commune})`;
}

export function cropKey(item: ParcelOverview): string {
  return item.lastReport?.crop.name ?? NO_REPORT;
}

export function countActiveFilters(filters: Filters): number {
  return filters.areas.length + filters.localities.length + filters.crops.length;
}

// groups are joined with AND, values inside a group with OR (area: smallest threshold)
export function filterParcels(items: ParcelOverview[], filters: Filters): ParcelOverview[] {
  const minArea = filters.areas.length > 0 ? Math.min(...filters.areas) : null;
  return items.filter(
    (item) =>
      (minArea === null || item.parcel.areaHa > minArea) &&
      (filters.localities.length === 0 || filters.localities.includes(localityKey(item))) &&
      (filters.crops.length === 0 || filters.crops.includes(cropKey(item))),
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'pl'));
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

export interface ParcelFiltersProps {
  parcels: ParcelOverview[];
  value: Filters;
  onChange: (next: Filters) => void;
}

interface GroupProps {
  legend: string;
  options: { value: string; label: string }[];
  isChecked: (value: string) => boolean;
  onToggle: (value: string) => void;
}

function Group({ legend, options, isChecked, onToggle }: GroupProps) {
  return (
    <Box component="fieldset" sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
      <Typography component="legend" sx={{ fontWeight: 800, fontSize: '1.125rem', mb: 0.5 }}>
        {legend}
      </Typography>
      <FormGroup>
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            label={option.label}
            control={
              <Checkbox
                checked={isChecked(option.value)}
                onChange={() => onToggle(option.value)}
                sx={{ p: 1.5 }}
              />
            }
            sx={{
              minHeight: 48,
              m: 0,
              '& .MuiFormControlLabel-label': { fontSize: '1.125rem', overflowWrap: 'anywhere' },
            }}
          />
        ))}
      </FormGroup>
    </Box>
  );
}

export function ParcelFilters({ parcels, value, onChange }: ParcelFiltersProps) {
  const localities = unique(parcels.map(localityKey));
  const crops = unique(
    parcels.flatMap((item) => (item.lastReport ? [item.lastReport.crop.name] : [])),
  );
  const hasUnreported = parcels.some((item) => !item.lastReport);
  const cropOptions = [
    ...crops.map((name) => ({ value: name, label: name })),
    ...(hasUnreported ? [{ value: NO_REPORT, label: 'Bez raportu' }] : []),
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Group
        legend="Powierzchnia"
        options={AREA_THRESHOLDS.map((ha) => ({ value: String(ha), label: `Powyżej ${ha} ha` }))}
        isChecked={(entry) => value.areas.includes(Number(entry))}
        onToggle={(entry) => onChange({ ...value, areas: toggle(value.areas, Number(entry)) })}
      />
      <Group
        legend="Miejscowość"
        options={localities.map((name) => ({ value: name, label: name }))}
        isChecked={(entry) => value.localities.includes(entry)}
        onToggle={(entry) => onChange({ ...value, localities: toggle(value.localities, entry) })}
      />
      <Group
        legend="Uprawa"
        options={cropOptions}
        isChecked={(entry) => value.crops.includes(entry)}
        onToggle={(entry) => onChange({ ...value, crops: toggle(value.crops, entry) })}
      />
      <Button
        variant="outlined"
        onClick={() => onChange(EMPTY_FILTERS)}
        disabled={countActiveFilters(value) === 0}
        sx={{ minHeight: 48, fontSize: '1.125rem', alignSelf: 'flex-start' }}
      >
        Wyczyść filtry
      </Button>
    </Box>
  );
}
