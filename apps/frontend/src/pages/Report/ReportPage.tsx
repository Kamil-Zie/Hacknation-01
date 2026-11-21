// UI-S-003 Raport
import { Alert, Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { useReportQuery } from '@/api/analyses';
import { ApiError } from '@/api/client';
import { ReportActions } from '@/components/ReportActions/ReportActions';
import { ReportAccountBadge } from '@/components/ReportAccountBadge/ReportAccountBadge';
import { ReportBody } from '@/components/ReportBody/ReportBody';
import { ReportHeader } from '@/components/ReportHeader/ReportHeader';

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useReportQuery(id);

  if (!data && isLoading) {
    return (
      <Stack spacing={2} aria-busy="true" aria-label="Ładowanie raportu" role="status">
        <Skeleton variant="text" height={56} width="70%" />
        <Skeleton variant="text" width="50%" />
        <Skeleton variant="rounded" height={240} />
        <Skeleton variant="rounded" height={320} />
      </Stack>
    );
  }
  if (!data && isError) {
    const notFound =
      error instanceof ApiError && (error.status === 404 || error.code.includes('NOT_FOUND'));
    return (
      <Alert
        severity="error"
        role="alert"
        action={
          notFound ? (
            <Button color="inherit" component={RouterLink} to="/" sx={{ minHeight: 44 }}>
              Nowa analiza
            </Button>
          ) : (
            <Button color="inherit" onClick={() => refetch()} sx={{ minHeight: 44 }}>
              Spróbuj ponownie
            </Button>
          )
        }
      >
        {notFound
          ? 'Nie znaleziono raportu. Mógł wygasnąć albo link jest niepełny.'
          : error.message || 'Nie udało się pobrać raportu.'}
      </Alert>
    );
  }
  if (!data) return <Typography>Brak raportu.</Typography>;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2.5, md: 3.5 },
        maxWidth: 1600,
        mx: 'auto',
        width: '100%',
        // room for the fixed bottom action bar on phones
        pb: { xs: 12, md: 0 },
      }}
    >
      {isError && <Alert severity="warning">Nie udało się odświeżyć raportu.</Alert>}
      <ReportHeader report={data} actions={<ReportActions reportId={data.id} />} />
      <ReportAccountBadge report={data} />
      <ReportBody report={data} />
    </Box>
  );
}
