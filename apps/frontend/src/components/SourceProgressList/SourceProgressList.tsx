// UI-C-005 SourceProgressList: per-source fetch state (spinner -> ok/cached/missing/timeout/error) with indicative progress bar
import { Box, Chip, CircularProgress, LinearProgress, Stack, Typography } from '@mui/material';

import type { DataSource, SourceStatus, SourceStatusCode } from '@/api/sources';

const PROGRESS_TOTAL_MS = 30_000;

interface SourceProgressListProps {
  sources: DataSource[];
  /** null = fetching in progress */
  statuses: SourceStatus[] | null;
  elapsedMs: number;
}

const STATUS_VIEW: Record<
  SourceStatusCode,
  { symbol: string; text: string; color: 'success' | 'info' | 'warning' | 'error' }
> = {
  ok: { symbol: '✓', text: 'Pobrano', color: 'success' },
  cached: { symbol: '↻', text: 'Z pamięci podręcznej', color: 'info' },
  missing: { symbol: '–', text: 'Brak danych', color: 'warning' },
  timeout: { symbol: '⏱', text: 'Przekroczono czas', color: 'warning' },
  error: { symbol: '✕', text: 'Błąd', color: 'error' },
};

export function SourceProgressList({ sources, statuses, elapsedMs }: SourceProgressListProps) {
  const isFetching = statuses === null;
  const progress = Math.min(100, (elapsedMs / PROGRESS_TOTAL_MS) * 100);

  return (
    <Stack spacing={2} aria-live="polite">
      {isFetching && (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Pobieram dane z {sources.length} źródeł…
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            aria-label="Orientacyjny postęp pobierania"
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      )}
      <Box
        component="ul"
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
        }}
      >
        {sources.map((source) => {
          const status = statuses?.find((item) => item.sourceId === source.id);
          const view = status ? STATUS_VIEW[status.status] : null;
          return (
            <Box
              component="li"
              key={source.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                minHeight: 44,
                p: 1.5,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2">{source.label}</Typography>
                {status?.message && (
                  <Typography variant="caption" color="text.secondary">
                    {status.message}
                  </Typography>
                )}
              </Box>
              {view ? (
                <Chip
                  size="small"
                  color={view.color}
                  variant="outlined"
                  label={`${view.symbol} ${view.text}`}
                />
              ) : (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={18} aria-hidden />
                  <Typography variant="caption" color="text.secondary">
                    {isFetching ? 'Pobieranie…' : 'Brak statusu'}
                  </Typography>
                </Stack>
              )}
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}
