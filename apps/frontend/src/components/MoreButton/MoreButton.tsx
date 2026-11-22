// UI-C-012 MoreButton: "Pokaż więcej / Pokaż mniej" look with rotating arrow, used inside Expandable header (design Kropla)
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box } from '@mui/material';

export interface MoreButtonProps {
  /** neutral: grey, for tiles whose own colour already carries the status (T-103 drought tile) */
  variant?: 'primary' | 'red' | 'neutral';
  size?: 'medium' | 'large';
  open?: boolean;
}

export function MoreButton({
  variant = 'primary',
  size = 'medium',
  open = false,
}: MoreButtonProps) {
  return (
    <Box
      component="span"
      className="more-btn"
      sx={(theme) => {
        const main =
          variant === 'red'
            ? theme.palette.error.main
            : variant === 'neutral'
              ? theme.palette.text.secondary
              : theme.palette.primary.main;
        const hover =
          variant === 'red'
            ? theme.palette.kropla.alertHigh
            : variant === 'neutral'
              ? theme.palette.text.primary
              : theme.palette.primary.main;
        const hoverText =
          variant === 'neutral' ? theme.palette.background.paper : theme.palette.common.white;
        return {
          boxSizing: 'border-box',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          minHeight: size === 'large' ? 72 : 56,
          px: 2.5,
          borderRadius: '12px',
          bgcolor: 'background.paper',
          border: `2px solid ${main}`,
          color: main,
          fontSize: size === 'large' ? '1.3125rem' : '1.1875rem',
          fontWeight: 800,
          textAlign: 'center',
          transition: 'background-color .15s, color .15s, border-color .15s',
          '[role=button]:hover &, [role=button]:focus-visible &': {
            bgcolor: hover,
            borderColor: hover,
            color: hoverText,
          },
        };
      }}
    >
      <span>{open ? 'Pokaż mniej' : 'Pokaż więcej'}</span>
      <ExpandMoreIcon
        aria-hidden
        sx={{
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 220ms',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      />
    </Box>
  );
}
