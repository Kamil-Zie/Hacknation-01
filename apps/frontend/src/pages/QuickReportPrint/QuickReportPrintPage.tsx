// UI-S-014 UI-S-004 T-100 Quick report print: all ready reports of a quick report on one printout, each from a new page
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import { Alert, Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useQueries } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';

import { getReport, REPORTS_KEY } from '@/api/analyses';
import type { Report } from '@/api/types';
import { ReportBody } from '@/components/ReportBody/ReportBody';
import { ReportHeader } from '@/components/ReportHeader/ReportHeader';
import { formatDateTime } from '@/utils/format';

const AUTO_PRINT_DELAY_MS = 2000;
const MAX_REPORTS = 5;

const sheetSx = {
  maxWidth: '210mm',
  mx: 'auto',
  p: { xs: 2, md: '12mm' },
  borderRadius: { xs: 0, md: 1 },
} as const;

function PrintedReport({ report }: { report: Report }) {
  return (
    <Stack spacing={2.5}>
      <ReportHeader report={report} kicker="Kropelka – raport wody" />
      <ReportBody report={report} />
      <Stack component="footer" spacing={0.5} className="print-footer">
        <Typography variant="body2">
          Raport opiera się na danych modelowych i satelitarnych z ograniczoną rozdzielczością. Nie
          zastępuje oględzin pola ani porady doradcy rolnego.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Wygenerowano: {formatDateTime(report.computedAt)}. Metodyka: {report.methodologyVersion}.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
          Raport online: {`${window.location.origin}/report/${report.id}`}
        </Typography>
      </Stack>
    </Stack>
  );
}

export function QuickReportPrintPage() {
  const [searchParams] = useSearchParams();
  const ids = (searchParams.get('ids') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_REPORTS);
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: [...REPORTS_KEY, id],
      queryFn: () => getReport(id),
      retry: false,
    })),
  });
  const isLoading = queries.some((query) => query.isPending);
  const reports = queries.flatMap((query) => (query.data ? [query.data] : []));
  const failed = queries.filter((query) => query.isError).length;
  const isReady = !isLoading && reports.length > 0;

  // Expand native <details> so the printout shows full content
  useEffect(() => {
    if (!isReady) return;
    document.querySelectorAll('details').forEach((el) => {
      el.open = true;
    });
  }, [isReady]);

  // Auto print once, after map tiles had time to load
  useEffect(() => {
    if (!isReady || window.self !== window.top) return;
    const timer = window.setTimeout(() => window.print(), AUTO_PRINT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isReady]);

  let content;
  if (isLoading) {
    content = (
      <Paper className="print-sheet" elevation={1} sx={sheetSx}>
        <Stack spacing={2} aria-busy="true" aria-label="Ładowanie raportów" role="status">
          <Skeleton variant="text" height={56} width="70%" />
          <Skeleton variant="text" width="50%" />
          <Skeleton variant="rounded" height={240} />
        </Stack>
      </Paper>
    );
  } else if (reports.length === 0) {
    content = (
      <Paper className="print-sheet" elevation={1} sx={sheetSx}>
        <Alert severity="error" role="alert" sx={{ fontSize: '1.125rem' }}>
          Nie ma gotowych raportów do wydruku. Wróć i zrób szybki raport jeszcze raz.
        </Alert>
      </Paper>
    );
  } else {
    content = reports.map((report, index) => (
      <Paper
        key={`${report.id}-${index}`}
        className="print-sheet"
        elevation={1}
        sx={{ ...sheetSx, mt: index > 0 ? 3 : 0, breakBefore: index > 0 ? 'page' : 'auto' }}
      >
        <PrintedReport report={report} />
      </Paper>
    ));
  }

  return (
    <Box className="print-screen" sx={{ bgcolor: 'grey.100', minHeight: '100vh', py: { md: 3 } }}>
      <Stack className="no-print" spacing={1.5} sx={{ maxWidth: '210mm', mx: 'auto', p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            component={RouterLink}
            to="/szybki-raport"
            startIcon={<ArrowBackIcon />}
            sx={{ minHeight: 48 }}
          >
            Wróć do szybkiego raportu
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            disabled={!isReady}
            onClick={() => window.print()}
            sx={{ minHeight: 48 }}
          >
            Drukuj ponownie
          </Button>
        </Stack>
        {isReady && (
          <Alert severity="info" sx={{ fontSize: '1.125rem' }}>
            {`Raportów w wydruku: ${reports.length}. Aby zapisać PDF, w oknie drukowania wybierz »Zapisz jako PDF«.`}
          </Alert>
        )}
        {failed > 0 && isReady && (
          <Alert severity="warning" sx={{ fontSize: '1.125rem' }}>
            {`Pominięto raporty, których nie udało się pobrać: ${failed}.`}
          </Alert>
        )}
      </Stack>
      <Box component="main">{content}</Box>
    </Box>
  );
}
