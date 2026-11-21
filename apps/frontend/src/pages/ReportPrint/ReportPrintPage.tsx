// UI-S-004 Widok druku / PDF
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import { Alert, Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';

import { useReportQuery } from '@/api/analyses';
import { ApiError } from '@/api/client';
import { AssessmentSection } from '@/components/AssessmentSection/AssessmentSection';
import { ParcelMap } from '@/components/ParcelMap/ParcelMap';
import { RecommendationList } from '@/components/RecommendationList/RecommendationList';
import { ReportHeader } from '@/components/ReportHeader/ReportHeader';
import { SourcesLimitations } from '@/components/SourcesLimitations/SourcesLimitations';
import { VulnerabilityCauses } from '@/components/VulnerabilityCauses/VulnerabilityCauses';
import { formatDateTime } from '@/utils/format';

const AUTO_PRINT_DELAY_MS = 1500;

export function ReportPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError, error, refetch } = useReportQuery(id);
  const isReady = Boolean(data);
  const showPdfHint = searchParams.get('pdf') === '1';
  const skipAutoPrint = searchParams.get('noprint') === '1';

  // Expand native <details> so the printout shows full content
  useEffect(() => {
    if (!isReady) return;
    document.querySelectorAll('details').forEach((el) => {
      el.open = true;
    });
  }, [isReady]);

  // Auto print once, after map tiles had time to load
  useEffect(() => {
    if (!isReady || skipAutoPrint || window.self !== window.top) return;
    const timer = window.setTimeout(() => window.print(), AUTO_PRINT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isReady, skipAutoPrint]);

  const backTo = `/report/${encodeURIComponent(id ?? '')}`;

  let content;
  if (!data && isLoading) {
    content = (
      <Stack spacing={2} aria-busy="true" aria-label="Ładowanie raportu" role="status">
        <Skeleton variant="text" height={56} width="70%" />
        <Skeleton variant="text" width="50%" />
        <Skeleton variant="rounded" height={240} />
      </Stack>
    );
  } else if (!data && isError) {
    const notFound =
      error instanceof ApiError && (error.status === 404 || error.code.includes('NOT_FOUND'));
    content = (
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
  } else if (!data) {
    content = <Typography>Brak raportu.</Typography>;
  } else {
    content = (
      <Stack spacing={2.5}>
        {isError && <Alert severity="warning">Nie udało się odświeżyć raportu.</Alert>}
        <Typography variant="overline" color="text.secondary">
          Kropla – raport wody
        </Typography>
        <ReportHeader report={data} />
        <ParcelMap
          parcel={data.parcel}
          isInteractive={false}
          markers={data.recommendations.flatMap((r) =>
            r.location ? [{ lat: r.location.lat, lon: r.location.lon, label: r.title }] : [],
          )}
          height="90mm"
        />
        <AssessmentSection
          assessment={data.assessment}
          cropName={data.crop.name}
          analysisDate={data.analysisDate}
          dataGaps={data.dataGaps}
        />
        <VulnerabilityCauses vulnerability={data.vulnerability} causes={data.causes} />
        <RecommendationList
          recommendations={data.recommendations}
          dataGaps={data.dataGaps}
          isPrint
        />
        <Stack spacing={1}>
          <Typography variant="h2" component="h2">
            Źródła i ograniczenia
          </Typography>
          <SourcesLimitations
            sources={data.sources}
            limitations={data.limitations}
            dataGaps={data.dataGaps}
            confidenceReasons={data.assessment.confidenceReasons}
            methodologyVersion={data.methodologyVersion}
            isPrint
          />
        </Stack>
        <Stack component="footer" spacing={0.5} className="print-footer">
          <Typography variant="body2">
            Raport opiera się na danych modelowych i satelitarnych z ograniczoną rozdzielczością.
            Nie zastępuje oględzin pola ani porady doradcy rolnego.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Wygenerowano: {formatDateTime(data.computedAt)}. Metodyka: {data.methodologyVersion}.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            Raport online: {`${window.location.origin}/report/${data.id}`}
          </Typography>
        </Stack>
      </Stack>
    );
  }

  return (
    <Box className="print-screen" sx={{ bgcolor: 'grey.100', minHeight: '100vh', py: { md: 3 } }}>
      <Stack className="no-print" spacing={1.5} sx={{ maxWidth: '210mm', mx: 'auto', p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            component={RouterLink}
            to={backTo}
            startIcon={<ArrowBackIcon />}
            sx={{ minHeight: 44 }}
          >
            Wróć do raportu
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            sx={{ minHeight: 44 }}
          >
            Drukuj ponownie
          </Button>
        </Stack>
        {showPdfHint && (
          <Alert severity="info">W oknie drukowania wybierz »Zapisz jako PDF«.</Alert>
        )}
      </Stack>
      <Paper
        component="main"
        className="print-sheet"
        elevation={1}
        sx={{
          maxWidth: '210mm',
          mx: 'auto',
          p: { xs: 2, md: '12mm' },
          borderRadius: { xs: 0, md: 1 },
        }}
      >
        {content}
      </Paper>
    </Box>
  );
}
