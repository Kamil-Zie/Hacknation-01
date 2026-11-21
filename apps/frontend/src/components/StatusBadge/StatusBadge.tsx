// UI-C-012 StatusBadge
import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export interface StatusBadgeProps {
  kind: 'drought' | 'vulnerability' | 'confidence' | 'source';
  value: string;
  label?: string;
  size?: 'small' | 'medium';
}

type Tone = 'good' | 'warn' | 'bad' | 'unknown';

const TONE_ICON: Record<Tone, string> = { good: '✓', warn: '!', bad: '✕', unknown: '?' };

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

  // Outlined variant with colored border/icon and dark text keeps contrast >= 4.5:1.
  return (
    <Chip
      variant="outlined"
      size={size}
      icon={
        <span aria-hidden="true" style={{ color, fontWeight: 700, textAlign: 'center' }}>
          {TONE_ICON[tone]}
        </span>
      }
      label={text}
      sx={{
        borderColor: color,
        borderWidth: 2,
        color: 'text.primary',
        fontWeight: 600,
        bgcolor: 'background.paper',
        minHeight: size === 'medium' ? 32 : undefined,
      }}
    />
  );
}
