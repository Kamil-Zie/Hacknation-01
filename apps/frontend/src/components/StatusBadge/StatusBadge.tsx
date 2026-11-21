// UI-C-012 StatusBadge
import CachedIcon from '@mui/icons-material/Cached';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';

export interface StatusBadgeProps {
  kind: 'drought' | 'vulnerability' | 'confidence' | 'source';
  value: string;
  label?: string;
  size?: 'small' | 'medium';
}

type Tone = 'good' | 'warn' | 'bad' | 'unknown';

const TONE_ICON: Record<Tone, ReactElement> = {
  good: <CheckCircleOutlineIcon />,
  warn: <WarningAmberIcon />,
  bad: <HighlightOffIcon />,
  unknown: <HelpOutlineIcon />,
};

// Source states with their own meaning get a dedicated icon instead of the tone icon.
const SOURCE_ICON: Record<string, ReactElement> = {
  cached: <CachedIcon />,
  timeout: <ScheduleIcon />,
};

const LABELS: Record<StatusBadgeProps['kind'], Record<string, string>> = {
  drought: {
    none: 'Brak suszy',
    moderate: 'Susza umiarkowana',
    severe: 'Susza silna',
    unknown: 'Brak danych',
  },
  vulnerability: {
    low: 'Podatność niska',
    medium: 'Podatność średnia',
    high: 'Podatność wysoka',
    unknown: 'Brak danych',
  },
  confidence: { high: 'Pewność wysoka', medium: 'Pewność średnia', low: 'Pewność niska' },
  source: {
    ok: 'Dane aktualne',
    cached: 'Z pamięci podręcznej',
    missing: 'Brak danych',
    error: 'Błąd źródła',
    timeout: 'Przekroczony czas',
  },
};

const TONES: Record<StatusBadgeProps['kind'], Record<string, Tone>> = {
  drought: { none: 'good', moderate: 'warn', severe: 'bad', unknown: 'unknown' },
  vulnerability: { low: 'good', medium: 'warn', high: 'bad', unknown: 'unknown' },
  confidence: { high: 'good', medium: 'warn', low: 'bad' },
  source: { ok: 'good', cached: 'good', missing: 'unknown', error: 'bad', timeout: 'warn' },
};

export function StatusBadge({ kind, value, label, size = 'medium' }: StatusBadgeProps) {
  const { palette } = useTheme();
  const tone = TONES[kind][value] ?? 'unknown';
  const toneColor: Record<Tone, string> = {
    good: palette.drought.none,
    warn: palette.drought.moderate,
    bad: palette.drought.severe,
    unknown: palette.drought.unknown,
  };
  const color = toneColor[tone];
  const text = label ?? LABELS[kind][value] ?? 'Brak danych';
  const icon = (kind === 'source' && SOURCE_ICON[value]) || TONE_ICON[tone];

  // Outlined variant with colored border/icon and dark text keeps contrast >= 4.5:1.
  return (
    <Chip
      variant="outlined"
      size={size}
      icon={icon}
      label={text}
      sx={{
        '& .MuiChip-icon': { color },
        borderColor: color,
        borderWidth: 3,
        color: 'text.primary',
        fontWeight: 600,
        bgcolor: 'background.paper',
        minHeight: size === 'medium' ? 32 : undefined,
      }}
    />
  );
}
