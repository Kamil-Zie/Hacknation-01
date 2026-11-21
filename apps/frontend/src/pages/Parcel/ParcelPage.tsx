// UI-S-002 Uprawa, data i analiza
import { Stack, Typography } from '@mui/material';

export function ParcelPage() {
  return (
    <Stack spacing={{ xs: 2, md: 3 }}>
      <Typography variant="h1" component="h1">
        Uprawa, data i analiza
      </Typography>
      <Typography>Wybierz uprawę i datę, a następnie uruchom analizę działki.</Typography>
    </Stack>
  );
}
