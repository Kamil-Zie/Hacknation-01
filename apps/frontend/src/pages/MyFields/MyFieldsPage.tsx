// UI-S-011 API-017 API-018 My fields page: heading, create button, expandable FieldList [T-089]
import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { FieldList } from '@/components/FieldList/FieldList';

export function MyFieldsPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h1" component="h1" sx={{ mb: 1 }}>
          Moje pola
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: 18, maxWidth: '60ch' }}>
          Pole to kilka działek obok siebie, np. jedna uprawa na kilku działkach. Kliknij nazwę
          pola, aby zobaczyć jego działki.
        </Typography>
      </Box>
      <Box>
        <Button
          component={RouterLink}
          to="/pole/nowe"
          variant="contained"
          startIcon={<AddIcon aria-hidden />}
          sx={{ minHeight: 48, fontSize: 18 }}
        >
          Utwórz pole
        </Button>
      </Box>
      <FieldList hideHeader />
    </Box>
  );
}
