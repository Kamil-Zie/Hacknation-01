// UI-C-012 AlertLabel: state label on report cards, always icon + word + color (design Kropla)
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import { Box } from '@mui/material';

import type { AlertLevel } from '@/utils/reportState';

export interface AlertLabelProps {
  level: AlertLevel | 'wet';
  label: string;
  size?: 'small' | 'large';
}

export function AlertLabel({ level, label, size = 'small' }: AlertLabelProps) {
  const isLarge = size === 'large';
  const isFilled = level === 'high' || level === 'medium' || level === 'low' || level === 'wet';
  const Icon =
    level === 'ok'
      ? CheckCircleOutlineIcon
      : level === 'unknown'
        ? HelpOutlineIcon
        : PriorityHighIcon;
  return (
    <Box
      component="span"
      sx={(theme) => {
        const { kropla, drought, primary } = theme.palette;
        const fill = {
          high: { bg: kropla.alertHigh, fg: theme.palette.common.white },
          medium: { bg: kropla.alertMedium, fg: theme.palette.text.primary },
          low: { bg: kropla.alertLow, fg: theme.palette.text.primary },
          wet: { bg: primary.main, fg: primary.contrastText },
          ok: { bg: 'transparent', fg: drought.none },
          unknown: { bg: 'transparent', fg: drought.unknown },
        }[level];
        return {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          px: isLarge ? 2.75 : 1.75,
          py: isLarge ? 1.5 : 0.75,
          borderRadius: 9999,
          bgcolor: fill.bg,
          color: fill.fg,
          border: isFilled ? 0 : `2px solid ${fill.fg}`,
          fontSize: isLarge ? '1.375rem' : '1rem',
          fontWeight: 700,
          lineHeight: 1.3,
          whiteSpace: 'nowrap',
        };
      }}
    >
      <Icon aria-hidden sx={{ fontSize: isLarge ? 28 : 20 }} />
      {label}
    </Box>
  );
}
