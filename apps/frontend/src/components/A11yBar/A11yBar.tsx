// T-084 Accessibility bar above the header: text size A A A, high contrast toggle, links to accessibility pages
import ContrastIcon from '@mui/icons-material/Contrast';
import { Box, ButtonBase, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { srOnly } from '@/app/a11yStyles';
import { TEXT_SIZES, useA11yStore } from '@/store/a11y';

export const A11Y_LINKS = [
  { to: '/tekst-latwy-do-czytania', label: 'Tekst łatwy do czytania' },
  { to: '/deklaracja-dostepnosci', label: 'Deklaracja dostępności' },
  { to: '/mapa-strony', label: 'Mapa strony' },
];

// Fixed visual sizes of the three "A" so they stay distinguishable at every text size.
const LETTER_SIZE = ['1rem', '1.25rem', '1.5rem'];

const controlSx = {
  minWidth: 44,
  minHeight: 44,
  px: 1,
  borderRadius: 1,
  color: 'common.white',
  fontWeight: 800,
  lineHeight: 1,
  border: '2px solid transparent',
  '&:hover': { borderColor: 'rgba(255,255,255,0.6)' },
  '&[aria-pressed="true"]': { bgcolor: 'common.white', color: '#0B2545' },
} as const;

export function A11yBar() {
  const textSize = useA11yStore((state) => state.textSize);
  const highContrast = useA11yStore((state) => state.highContrast);
  const setTextSize = useA11yStore((state) => state.setTextSize);
  const toggleContrast = useA11yStore((state) => state.toggleContrast);

  return (
    <Box
      component="section"
      aria-label="Ułatwienia dostępu"
      className="a11y-bar no-print"
      sx={{ bgcolor: '#0B2545', color: 'common.white', px: { xs: 1, md: 4 } }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          columnGap: 2,
          rowGap: 0.5,
          py: 0.5,
          maxWidth: 1600,
          mx: 'auto',
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <Box role="group" aria-labelledby="a11y-text-size" sx={{ display: 'flex', gap: 0.5 }}>
            {/* Phones: label hidden visually, still read by screen readers (aria-labelledby) */}
            <Typography
              id="a11y-text-size"
              component="span"
              sx={{
                fontSize: '1rem',
                alignSelf: 'center',
                mr: 0.5,
                '@media (max-width: 599.95px)': srOnly,
              }}
            >
              Rozmiar tekstu:
            </Typography>
            {TEXT_SIZES.map((size) => (
              <ButtonBase
                key={size.value}
                aria-pressed={textSize === size.value}
                aria-label={`Rozmiar tekstu: ${size.label}`}
                onClick={() => setTextSize(size.value)}
                sx={controlSx}
              >
                <Box component="span" aria-hidden sx={{ fontSize: LETTER_SIZE[size.value] }}>
                  A
                </Box>
              </ButtonBase>
            ))}
          </Box>
          <ButtonBase
            aria-pressed={highContrast}
            onClick={toggleContrast}
            sx={{ ...controlSx, gap: 1, px: 1.5, fontWeight: 700, fontSize: '1rem' }}
          >
            <ContrastIcon aria-hidden sx={{ fontSize: '1.25rem' }} />
            <Box component="span" sx={{ '@media (max-width: 599.95px)': srOnly }}>
              Wysoki kontrast
            </Box>
          </ButtonBase>
        </Box>
        <Box
          component="nav"
          aria-label="Dostępność"
          sx={{ display: { xs: 'none', md: 'flex' }, flexWrap: 'wrap', columnGap: 2.5 }}
        >
          {A11Y_LINKS.map((item) => (
            <Link
              key={item.to}
              component={RouterLink}
              to={item.to}
              color="inherit"
              underline="always"
              sx={{ fontSize: '1rem', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
            >
              {item.label}
            </Link>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
