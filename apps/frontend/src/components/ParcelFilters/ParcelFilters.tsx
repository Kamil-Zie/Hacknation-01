// UI-C-019 ParcelFilters: checkbox groups (area, locality, crop with icons) and client-side filtering of account parcels [T-088, T-094]
import { Box, Button, Checkbox, FormControlLabel, FormGroup, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import type { ParcelOverview } from '@/api/types';
import { CropIcon } from '@/components/CropIcon/CropIcon';

export const NO_REPORT = '__no_report__';
// "below 1 ha" option, stored in Filters.areas next to the "above N ha" thresholds
export const BELOW_ONE_HA = 0;
export const AREA_THRESHOLDS = [1, 5, 10] as const;

export interface Filters {
  /** BELOW_ONE_HA and/or thresholds in ha (above the smallest selected one); OR inside the group */
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
  const thresholds = areas.filter((ha) => ha !== BELOW_ONE_HA);
  const below = areas.includes(BELOW_ONE_HA) && areaHa < 1;
  const above = thresholds.length > 0 && areaHa > Math.min(...thresholds);
  return below || above;
}

// groups are joined with AND, values inside a group with OR (area: below 1 ha or above the smallest threshold)
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
        options={[
          { value: String(BELOW_ONE_HA), label: 'Poniżej 1 ha' },
          ...AREA_THRESHOLDS.map((ha) => ({ value: String(ha), label: `Powyżej ${ha} ha` })),
        ]}
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
