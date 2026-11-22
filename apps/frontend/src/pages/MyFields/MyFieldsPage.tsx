// UI-S-011 API-017 API-018 My fields page: heading, create button (owner/partner, T-104), expandable FieldList [T-089]
import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { FieldList } from '@/components/FieldList/FieldList';
import { useCanEdit } from '@/store/session';

export function MyFieldsPage() {
  const canEdit = useCanEdit();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h1" component="h1" sx={{ mb: 1 }}>
          Moje grupy działek
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: 18, maxWidth: '60ch' }}>
          Grupa działek to kilka działek obok siebie, np. jedna uprawa na kilku działkach. Kliknij
          nazwę grupy, aby zobaczyć jej działki.
        </Typography>
      </Box>
      {canEdit && (
        <Box>
          <Button
            component={RouterLink}
            to="/pole/nowe"
            variant="contained"
            startIcon={<AddIcon aria-hidden />}
            sx={{ minHeight: 48, fontSize: 18 }}
          >
            Dodaj grupę działek
          </Button>
        </Box>
      )}
      <FieldList hideHeader />
    </Box>
  );
}
