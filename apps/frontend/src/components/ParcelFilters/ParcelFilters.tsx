// UI-C-019 ParcelFilters: checkbox groups (area ranges, crop with icons, locality) and client-side filtering of account parcels [T-088, T-094]
import { Box, Button, Checkbox, FormControlLabel, FormGroup, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import type { ParcelOverview } from '@/api/types';
import { CropIcon } from '@/components/CropIcon/CropIcon';

export const NO_REPORT = '__no_report__';
// T-103 area ranges [from, to) in ha; Filters.areas keeps their indexes
export const AREA_RANGES: { from: number; to: number; label: string }[] = [
  { from: 0, to: 1, label: 'Poniżej 1 ha' },
  { from: 1, to: 5, label: '1–5 ha' },
  { from: 5, to: 10, label: '5–10 ha' },
  { from: 10, to: Infinity, label: 'Powyżej 10 ha' },
];

export interface Filters {
  /** indexes into AREA_RANGES; OR inside the group */
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

function matchesArea(areaHa: number, areas: number[]): boolean {
  if (areas.length === 0) return true;
  return areas.some((index) => {
    const range = AREA_RANGES[index];
    return range !== undefined && areaHa >= range.from && areaHa < range.to;
  });
}

// groups are joined with AND, values inside a group with OR
export function filterParcels(items: ParcelOverview[], filters: Filters): ParcelOverview[] {
  return items.filter(
    (item) =>
      matchesArea(item.parcel.areaHa, filters.areas) &&
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
  options: { value: string; label: string; icon?: ReactNode }[];
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
            label={
              option.icon ? (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  {option.icon}
                  {option.label}
                </Box>
              ) : (
                option.label
              )
            }
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
  const cropCodes = new Map<string, string>();
  for (const item of parcels) {
    if (item.lastReport) cropCodes.set(item.lastReport.crop.name, item.lastReport.crop.code);
  }
  const crops = unique([...cropCodes.keys()]);
  const hasUnreported = parcels.some((item) => !item.lastReport);
  const cropOptions = [
    ...crops.map((name) => ({
      value: name,
      label: name,
      icon: <CropIcon cropCode={cropCodes.get(name) ?? ''} />,
    })),
    ...(hasUnreported ? [{ value: NO_REPORT, label: 'Bez raportu' }] : []),
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Group
        legend="Powierzchnia"
        options={AREA_RANGES.map((range, index) => ({ value: String(index), label: range.label }))}
        isChecked={(entry) => value.areas.includes(Number(entry))}
        onToggle={(entry) => onChange({ ...value, areas: toggle(value.areas, Number(entry)) })}
      />
      <Group
        legend="Uprawa"
        options={cropOptions}
        isChecked={(entry) => value.crops.includes(entry)}
        onToggle={(entry) => onChange({ ...value, crops: toggle(value.crops, entry) })}
      />
      <Group
        legend="Miejscowość"
        options={localities.map((name) => ({ value: name, label: name }))}
        isChecked={(entry) => value.localities.includes(entry)}
        onToggle={(entry) => onChange({ ...value, localities: toggle(value.localities, entry) })}
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
