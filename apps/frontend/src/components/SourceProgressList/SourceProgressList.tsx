// UI-C-005 SourceProgressList: per-source fetch state (spinner -> ok/cached/missing/timeout/error) with indicative progress bar
import { Box, CircularProgress, LinearProgress, Stack, Typography } from '@mui/material';

import type { DataSource, SourceStatus } from '@/api/types';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';

// Real API-004 with Sentinel-2 takes 8–16 s (backend-1, 20261121-1425)
const PROGRESS_TOTAL_MS = 15_000;

interface SourceProgressListProps {
  sources: DataSource[];
  /** null = fetching in progress */
  statuses: SourceStatus[] | null;
  elapsedMs: number;
}

// Optional / fallback sources (coord decision 20261121-1251): eumetsat is always missing and
// lives only in data gaps; nasa_power appears only when it actually served as the fallback
const HIDDEN_WHILE_FETCHING = new Set(['eumetsat', 'nasa_power']);
const SHOWN_ONLY_WHEN_USED = new Set(['nasa_power']);

function isVisible(sourceId: string, statuses: SourceStatus[] | null): boolean {
  if (sourceId === 'eumetsat') return false;
  if (statuses === null) return !HIDDEN_WHILE_FETCHING.has(sourceId);
  if (!SHOWN_ONLY_WHEN_USED.has(sourceId)) return true;
  const status = statuses.find((item) => item.sourceId === sourceId)?.status;
  return status === 'ok' || status === 'cached';
}

export function SourceProgressList({
  sources: allSources,
  statuses,
  elapsedMs,
}: SourceProgressListProps) {
  const isFetching = statuses === null;
  const progress = Math.min(100, (elapsedMs / PROGRESS_TOTAL_MS) * 100);
  const sources = allSources.filter((source) => isVisible(source.id, statuses));

  return (
    <Stack spacing={2}>
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
          // lg sits in the 480 px side panel of UI-S-002, so one column there
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'repeat(2, minmax(0, 1fr))',
            lg: 'minmax(0, 1fr)',
          },
        }}
      >
        {sources.map((source) => {
          const status = statuses?.find((item) => item.sourceId === source.id);
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
              {status ? (
                <StatusBadge kind="source" value={status.status} size="small" />
              ) : !isFetching ? (
                // Source absent from report.sources: show it as missing, not as still loading
                <StatusBadge kind="source" value="missing" size="small" />
              ) : (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={18} aria-hidden />
                  <Typography variant="caption" color="text.secondary">
                    Pobieranie…
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
