// UI-C-002 ParcelMap: "Mapa" / "Satelita" switch (large buttons, icon + label)
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import SatelliteAltOutlinedIcon from '@mui/icons-material/SatelliteAltOutlined';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

import type { MapLayer } from './mapLayers';

interface MapLayerToggleProps {
  value: MapLayer;
  onChange: (layer: MapLayer) => void;
}

const OPTIONS = [
  { value: 'map', label: 'Mapa', icon: <MapOutlinedIcon aria-hidden /> },
  { value: 'satellite', label: 'Satelita', icon: <SatelliteAltOutlinedIcon aria-hidden /> },
] as const;

export function MapLayerToggle({ value, onChange }: MapLayerToggleProps) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      onChange={(_event, next: MapLayer | null) => {
        if (next) onChange(next);
      }}
      aria-label="Rodzaj mapy"
      sx={{ bgcolor: 'background.paper', boxShadow: 3, borderRadius: '12px' }}
    >
      {OPTIONS.map((option) => (
        <ToggleButton
          key={option.value}
          value={option.value}
          sx={{
            minHeight: 48,
            minWidth: 48,
            px: { xs: 1.25, md: 2 },
            gap: 0.75,
            fontSize: '1.125rem',
            fontWeight: 700,
            color: 'text.primary',
            '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText' },
            '&.Mui-selected:hover': { bgcolor: 'primary.dark' },
          }}
        >
          {option.icon}
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
