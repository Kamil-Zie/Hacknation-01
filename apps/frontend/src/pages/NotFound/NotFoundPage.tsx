// T-006 404 page
import { Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Stack spacing={{ xs: 2, md: 3 }} alignItems="flex-start">
      <Typography variant="h1" component="h1">
        Nie znaleziono strony
      </Typography>
      <Typography>Adres, który wpisano, nie istnieje.</Typography>
      <Button component={RouterLink} to="/" variant="contained" sx={{ minHeight: 44 }}>
        Wróć do startu
      </Button>
    </Stack>
  );
}
