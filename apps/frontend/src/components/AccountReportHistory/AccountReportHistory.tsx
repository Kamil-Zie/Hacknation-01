// UI-S-006 AccountReportHistory: „Historia” section, reports saved in the active household account
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { useAccountReportsQuery } from '@/api/accounts';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { useSessionStore } from '@/store/session';

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('pl-PL');
}

export function AccountReportHistory() {
  const token = useSessionStore((state) => state.token);
  const accountId = useSessionStore((state) => state.activeAccountId);
  const query = useAccountReportsQuery(accountId, token);

  if (!token || !accountId) return null;

  let body;
  if (query.isPending) {
    body = (
      <Stack spacing={1} aria-label="Ładowanie historii">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} variant="rounded" height={88} />
        ))}
      </Stack>
    );
  } else if (query.isError) {
    body = (
      <Alert
        severity="error"
        role="alert"
        action={
          <Button color="inherit" sx={{ minHeight: 44 }} onClick={() => void query.refetch()}>
            Spróbuj ponownie
          </Button>
        }
      >
        Nie udało się pobrać historii raportów.
      </Alert>
    );
  } else if (query.data.length === 0) {
    body = (
      <Typography color="text.secondary">
        Brak zapisanych raportów. Uruchom analizę, będąc zalogowanym, a pojawi się tutaj.
      </Typography>
    );
  } else {
    body = (
      <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {query.data.map((item) => (
          <li key={item.id}>
            <Card variant="outlined">
              <CardActionArea
                component={RouterLink}
                to={`/report/${encodeURIComponent(item.id)}`}
                sx={{ p: 2, minHeight: 44 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { md: 'center' },
                    gap: 1,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" component="p" sx={{ fontWeight: 600 }}>
                      Działka {item.parcel.parcelNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.parcel.region}, {item.parcel.commune}
                    </Typography>
                    <Typography variant="body2">
                      {item.crop.name} · analiza z {formatDate(item.analysisDate)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Utworzono {formatDate(item.createdAt)}
                    </Typography>
                  </Box>
                  <StatusBadge kind="drought" value={item.droughtClass} />
                </Box>
              </CardActionArea>
            </Card>
          </li>
        ))}
      </Stack>
    );
  }

  return (
    <Box component="section" aria-labelledby="account-history-heading">
      <Typography id="account-history-heading" variant="h2" sx={{ mb: 2 }}>
        Historia
      </Typography>
      {body}
    </Box>
  );
}
