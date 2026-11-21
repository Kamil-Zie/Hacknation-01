// T-001 Providers: MUI theme, TanStack Query, router
import { CssBaseline, GlobalStyles, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';

import { a11yStyles } from '@/app/a11yStyles';
import { router } from '@/app/router';
import { theme } from '@/app/theme';

const queryClient = new QueryClient();

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={a11yStyles} />
      <GlobalStyles
        styles={(t) => ({
          // Static map on the print sheet: no zoom buttons (ParcelMap keeps them even when not interactive).
          '.print-sheet .leaflet-control-zoom': { display: 'none' },
          // The A4 sheet is ~210 mm wide whatever the screen: overview in one column, cards in 2 columns,
          // no "Pokaż więcej" buttons (all <details> are open).
          '.print-sheet .report-overview': { gridTemplateColumns: 'minmax(0, 1fr) !important' },
          '.print-sheet .card-grid': {
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr)) !important',
          },
          '.print-sheet .card-grid-item': { gridColumn: 'auto !important' },
          '.print-sheet .card-grid-full': { gridColumn: '1 / -1 !important' },
          '.print-sheet .MuiCollapse-root': {
            height: 'auto !important',
            visibility: 'visible !important',
          },
          '.print-sheet .more-btn, .print-sheet .no-print': { display: 'none !important' },
          '.print-sheet .report-overview > *': { order: '0 !important' },
          '.leaflet-control-zoom a': { width: 44, height: 44, lineHeight: '44px', fontSize: 22 },
          '@media print': {
            '.leaflet-control-zoom': { display: 'none !important' },
            '@page': { size: 'A4 portrait', margin: '12mm' },
            body: { fontSize: '10.5pt', backgroundColor: t.palette.background.paper },
            '.no-print': { display: 'none !important' },
            '*': { boxShadow: 'none !important' },
            '.MuiCard-root, .MuiPaper-root': {
              backgroundColor: `${t.palette.background.paper} !important`,
            },
            '.MuiCard-root, .MuiAccordion-root, .MuiTableRow-root, .MuiAlert-root, li': {
              breakInside: 'avoid',
              pageBreakInside: 'avoid',
            },
            'h1, h2, h3, h4': { breakAfter: 'avoid', pageBreakAfter: 'avoid' },
            a: { color: 'inherit !important', textDecoration: 'none !important' },
            '.print-footer a[href^="http"]::after, .MuiTable-root a[href^="http"]::after': {
              content: '" (" attr(href) ")"',
            },
            '.print-screen': { backgroundColor: 'transparent !important', padding: '0 !important' },
            '.print-sheet': { maxWidth: 'none !important', padding: '0 !important' },
            'details > *:not(summary)': { display: 'block !important' },
            'summary::marker': { content: '""' },
            '.MuiCollapse-hidden': { visibility: 'visible !important', height: 'auto !important' },
            '.MuiCollapse-root': { height: 'auto !important', visibility: 'visible !important' },
            '.MuiAccordionSummary-expandIconWrapper': { display: 'none' },
            '.MuiTableContainer-root': { overflow: 'visible !important' },
            'td, th': { overflowWrap: 'anywhere', wordBreak: 'break-word' },
            'a::after': { overflowWrap: 'anywhere', wordBreak: 'break-all' },
          },
        })}
      />
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
