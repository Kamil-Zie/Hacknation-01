// T-084 T-099 T-103 Accessibility bar above the header: text size A A A, high contrast and dark mode toggles, reset to default view, links to accessibility pages
// (links are inline from md up, in a "Więcej" menu on phones; the footer has no accessibility options)
import ContrastIcon from '@mui/icons-material/Contrast';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { Box, ButtonBase, Link, Menu, MenuItem, Typography } from '@mui/material';
import { useRef, useState } from 'react';
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
  minWidth: 48,
  minHeight: 48,
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
  const darkMode = useA11yStore((state) => state.darkMode);
  const toggleContrast = useA11yStore((state) => state.toggleContrast);
  const toggleDark = useA11yStore((state) => state.toggleDark);
  const customized = useA11yStore((state) => state.customized);
  const resetA11y = useA11yStore((state) => state.resetA11y);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  // after the reset the button disappears, so keyboard focus moves to the standard text size
  const defaultSizeRef = useRef<HTMLButtonElement>(null);

  return (
    <Box
      component="section"
      aria-label="Ułatwienia dostępu"
      className="a11y-bar no-print"
      sx={{ bgcolor: '#0B2545', color: 'common.white', px: { xs: 0.5, sm: 1, md: 4 } }}
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
        <Box
          sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}
        >
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
                ref={size.value === 0 ? defaultSizeRef : undefined}
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
            sx={{
              ...controlSx,
              gap: 1,
              px: { xs: 0.5, sm: 1.5 },
              fontWeight: 700,
              fontSize: '1rem',
            }}
          >
            <ContrastIcon aria-hidden sx={{ fontSize: '1.25rem' }} />
            <Box component="span" sx={{ '@media (max-width: 599.95px)': srOnly }}>
              Wysoki kontrast
            </Box>
          </ButtonBase>
          <ButtonBase
            aria-pressed={darkMode}
            onClick={toggleDark}
            sx={{
              ...controlSx,
              gap: 1,
              px: { xs: 0.5, sm: 1.5 },
              fontWeight: 700,
              fontSize: '1rem',
            }}
          >
            <DarkModeIcon aria-hidden sx={{ fontSize: '1.25rem' }} />
            <Box component="span" sx={{ '@media (max-width: 599.95px)': srOnly }}>
              Tryb ciemny
            </Box>
          </ButtonBase>
          {customized && (
            <ButtonBase
              onClick={() => {
                resetA11y();
                defaultSizeRef.current?.focus();
              }}
              aria-label="Przywróć widok domyślny"
              sx={{
                ...controlSx,
                gap: 1,
                px: { xs: 0.5, sm: 1.5 },
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              <RestartAltIcon aria-hidden sx={{ fontSize: '1.25rem' }} />
              <Box component="span" sx={{ '@media (max-width: 599.95px)': srOnly }}>
                Widok domyślny
              </Box>
            </ButtonBase>
          )}
          <ButtonBase
            id="a11y-more-button"
            aria-haspopup="menu"
            aria-expanded={moreAnchor !== null}
            aria-controls={moreAnchor ? 'a11y-more-menu' : undefined}
            onClick={(event) => setMoreAnchor(event.currentTarget)}
            sx={{
              ...controlSx,
              display: { xs: 'inline-flex', md: 'none' },
              gap: 1,
              px: { xs: 0.5, sm: 1.5 },
              fontWeight: 700,
              fontSize: '1rem',
            }}
          >
            <MoreHorizIcon aria-hidden sx={{ fontSize: '1.5rem' }} />
            <Box component="span" sx={{ '@media (max-width: 599.95px)': srOnly }}>
              Więcej
            </Box>
          </ButtonBase>
          <Menu
            id="a11y-more-menu"
            anchorEl={moreAnchor}
            open={moreAnchor !== null}
            onClose={() => setMoreAnchor(null)}
            slotProps={{ list: { 'aria-labelledby': 'a11y-more-button' } }}
          >
            {A11Y_LINKS.map((item) => (
              <MenuItem
                key={item.to}
                component={RouterLink}
                to={item.to}
                onClick={() => setMoreAnchor(null)}
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>
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
              sx={{ fontSize: '1rem', minHeight: 48, display: 'inline-flex', alignItems: 'center' }}
            >
              {item.label}
            </Link>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
