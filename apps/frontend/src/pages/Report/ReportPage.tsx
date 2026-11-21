// UI-S-003 Raport
import { Alert, Box, Button, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

import { useReportQuery } from '@/api/analyses';
import { AssessmentSection } from '@/components/AssessmentSection/AssessmentSection';
import { ParcelMap } from '@/components/ParcelMap/ParcelMap';
import { ReportHeader } from '@/components/ReportHeader/ReportHeader';
import { ReportSectionNav } from '@/components/ReportSectionNav/ReportSectionNav';

const PLACEHOLDERS = [
  { id: 'podatnosc', title: 'Podatność i przyczyny' },
  { id: 'co-zrobic', title: 'Co zrobić' },
  { id: 'zrodla', title: 'Źródła i ograniczenia' },
];

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useReportQuery(id);

  if (isLoading) {
    return (
      <Stack spacing={2} aria-busy="true" aria-label="Ładowanie raportu" role="status">
        <Skeleton variant="text" height={56} width="70%" />
        <Skeleton variant="text" width="50%" />
        <Skeleton variant="rounded" height={240} />
        <Skeleton variant="rounded" height={320} />
      </Stack>
    );
  }
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
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 2, md: 3 },
        maxWidth: { md: 900, lg: 'none' },
        mx: 'auto',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(320px, 360px) minmax(0, 1fr)' },
        alignItems: 'start',
      }}
    >
      <Box sx={{ gridColumn: { lg: '1 / -1' } }}>
        <ReportHeader report={data} />
      </Box>
      <Stack spacing={2} sx={{ position: { lg: 'sticky' }, top: { lg: 16 }, minWidth: 0 }}>
        <ParcelMap
          parcel={data.parcel}
          isInteractive={false}
          height={{ xs: 240, md: '40vh', lg: 300 }}
        />
        <ReportSectionNav />
      </Stack>
      <Stack spacing={{ xs: 2, md: 3 }} sx={{ minWidth: 0 }}>
        <AssessmentSection
          assessment={data.assessment}
          cropName={data.crop.name}
          analysisDate={data.analysisDate}
          dataGaps={data.dataGaps}
        />
        {PLACEHOLDERS.map((section) => (
          <Card
            key={section.id}
            component="section"
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            sx={{ scrollMarginTop: 16 }}
          >
            <CardContent>
              <Typography id={`${section.id}-title`} variant="h2" component="h2" gutterBottom>
                {section.title}
              </Typography>
              <Typography color="text.secondary">Wkrótce</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
