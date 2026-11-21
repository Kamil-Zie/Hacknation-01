// UI-C-012 MoreButton: "Pokaż więcej / Pokaż mniej" look inside <summary> of a native <details> (design Kropla)
import { Box } from '@mui/material';

export interface MoreButtonProps {
  variant?: 'primary' | 'red';
  size?: 'medium' | 'large';
}

export function MoreButton({ variant = 'primary', size = 'medium' }: MoreButtonProps) {
  const isRed = variant === 'red';
  return (
    <Box
      component="span"
      className="more-btn"
      sx={(theme) => {
        const main = isRed ? theme.palette.error.main : theme.palette.primary.main;
        const hover = isRed ? theme.palette.kropla.alertHigh : theme.palette.primary.main;
        return {
          boxSizing: 'border-box',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
          'summary:hover &, summary:focus-visible &': {
            bgcolor: hover,
            borderColor: hover,
            color: theme.palette.common.white,
          },
          'details[open] > summary & .lbl-more': { display: 'none' },
          'details:not([open]) > summary & .lbl-less': { display: 'none' },
        };
      }}
    >
      <span className="lbl-more">Pokaż więcej</span>
      <span className="lbl-less">Pokaż mniej</span>
    </Box>
  );
}
