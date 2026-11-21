// UI-S-003 Raport
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

import { useReportQuery } from '@/api/analyses';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useReportQuery(id);

  if (isLoading) return <CircularProgress aria-label="Ładowanie raportu" />;
  if (isError) {
    return (
      <Alert
        severity="error"
        role="alert"
        action={
          <Button color="inherit" onClick={() => refetch()} sx={{ minHeight: 44 }}>
            Spróbuj ponownie
          </Button>
        }
      >
        {error.message || 'Nie udało się pobrać raportu.'}
      </Alert>
    );
  }
  if (!data) return <Typography>Brak raportu.</Typography>;

  return (
    <Stack spacing={{ xs: 2, md: 3 }}>
      <Typography variant="h1" component="h1">
        Raport: działka {data.parcel.id}
      </Typography>
      <Typography>
        {data.crop.name}, stan na {data.analysisDate}
      </Typography>
      <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
        {data.sources.map((source) => (
          <Stack key={source.sourceId} spacing={0.5} alignItems="flex-start">
            <Typography variant="caption">{source.label}</Typography>
            <StatusBadge kind="source" value={source.status} size="small" />
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
