// T-084 Page footer: accessibility pages (also the only place for them on phones) and data attribution
import { Box, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { A11Y_LINKS } from '@/components/A11yBar/A11yBar';

export function AppFooter() {
  return (
    <Box
      component="footer"
      className="no-print"
      sx={{ borderTop: 1, borderColor: 'divider', mt: 4, py: 3, px: { xs: 2, md: 4 } }}
    >
      <Box
        sx={{
          maxWidth: 1600,
          mx: 'auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          justifyContent: 'space-between',
        }}
      >
        <Box component="nav" aria-label="Stopka">
          <Box
            component="ul"
            sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexWrap: 'wrap', columnGap: 3 }}
          >
            {A11Y_LINKS.map((item) => (
              <li key={item.to}>
                <Link
                  component={RouterLink}
                  to={item.to}
                  underline="always"
                  sx={{
                    fontSize: '1.125rem',
                    minHeight: 44,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </Box>
        </Box>
        <Typography sx={{ color: 'text.secondary', fontSize: '1rem', alignSelf: 'center' }}>
          Kropelka · HackNation 2026 · dane: GUGiK, Copernicus, NASA POWER, OpenStreetMap
        </Typography>
      </Box>
    </Box>
  );
}
