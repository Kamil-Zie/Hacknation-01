// T-084 T-099 Page footer: data attribution (accessibility options live only in the top A11yBar)
import { Box, Typography } from '@mui/material';

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
        <Typography sx={{ color: 'text.secondary', fontSize: '1rem', alignSelf: 'center' }}>
          Kropelka · HackNation 2026 · dane: GUGiK, Copernicus, NASA POWER, OpenStreetMap
        </Typography>
      </Box>
    </Box>
  );
}
