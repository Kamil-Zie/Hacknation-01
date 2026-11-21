// UI-S-003 Raport
import { Alert, Box, Button, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { useReportQuery } from '@/api/analyses';
import { ApiError } from '@/api/client';
import { AssessmentSection } from '@/components/AssessmentSection/AssessmentSection';
import { ParcelMap } from '@/components/ParcelMap/ParcelMap';
import { ReportActions } from '@/components/ReportActions/ReportActions';
import { ReportHeader } from '@/components/ReportHeader/ReportHeader';
import { RecommendationList } from '@/components/RecommendationList/RecommendationList';
import { ReportSectionNav } from '@/components/ReportSectionNav/ReportSectionNav';
import { SourcesLimitations } from '@/components/SourcesLimitations/SourcesLimitations';
import { VulnerabilityCauses } from '@/components/VulnerabilityCauses/VulnerabilityCauses';

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
        display: 'grid',
        gap: { xs: 2, md: 3 },
        maxWidth: { md: 900, lg: 'none' },
        mx: 'auto',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(320px, 360px) minmax(0, 1fr)' },
        alignItems: 'start',
        pb: { xs: 11, md: 0 },
      }}
    >
      <Box sx={{ gridColumn: { lg: '1 / -1' }, display: 'grid', gap: { xs: 2, md: 2 } }}>
        {isError && <Alert severity="warning">Nie udało się odświeżyć raportu.</Alert>}
        <ReportHeader report={data} />
        <ReportActions reportId={data.id} />
      </Box>
      <Stack spacing={2} sx={{ position: { lg: 'sticky' }, top: { lg: 16 }, minWidth: 0 }}>
        <ParcelMap
          parcel={data.parcel}
          isInteractive={false}
          markers={data.recommendations.flatMap((r) =>
            r.location ? [{ lat: r.location.lat, lon: r.location.lon, label: r.title }] : [],
          )}
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
          charts={data.charts ?? null}
        />
        <VulnerabilityCauses vulnerability={data.vulnerability} causes={data.causes} />
        <RecommendationList recommendations={data.recommendations} dataGaps={data.dataGaps} />
        <Card
          component="section"
          id="zrodla"
          aria-labelledby="zrodla-title"
          sx={{ scrollMarginTop: 16 }}
        >
          <CardContent>
            <Stack spacing={2}>
              <Typography id="zrodla-title" variant="h2" component="h2">
                Źródła i ograniczenia
              </Typography>
              <SourcesLimitations
                sources={data.sources}
                limitations={data.limitations}
                dataGaps={data.dataGaps}
                confidenceReasons={data.assessment.confidenceReasons}
                methodologyVersion={data.methodologyVersion}
              />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
