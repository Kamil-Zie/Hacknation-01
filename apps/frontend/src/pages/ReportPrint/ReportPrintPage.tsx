// UI-S-004 Widok druku / PDF
import { Stack, Typography } from '@mui/material';

export function ReportPrintPage() {
  return (
    <Stack spacing={2} sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h1" component="h1">
        Widok druku / PDF
      </Typography>
      <Typography>Wersja raportu przygotowana do wydruku na papierze A4.</Typography>
    </Stack>
  );
}
