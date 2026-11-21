// T-001 Providers: MUI theme, TanStack Query, router
import { CssBaseline, GlobalStyles, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';

import { router } from '@/app/router';
import { theme } from '@/app/theme';

const queryClient = new QueryClient();

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={{ '@media print': { '.no-print': { display: 'none !important' } } }} />
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
