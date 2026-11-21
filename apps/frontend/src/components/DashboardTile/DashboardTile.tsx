// UI-S-009 DashboardTile: dashboard tile with a title and loading / error / empty / ready states
import { Alert, Box, Button, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export interface DashboardTileProps {
  id: string;
  title: string;
  isLoading?: boolean;
  isError?: boolean;
  errorText?: string;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyText?: string;
  children?: ReactNode;
  /** Grid placement, e.g. gridColumn / gridRow */
  sx?: object;
}

export function DashboardTile({
  id,
  title,
  isLoading = false,
  isError = false,
  errorText = 'Nie udało się pobrać danych.',
  onRetry,
  isEmpty = false,
  emptyText = 'Brak danych.',
  children,
  sx,
}: DashboardTileProps) {
  let body: ReactNode;
  if (isLoading) {
    body = (
      <Stack spacing={1} aria-label={`Ładowanie: ${title}`}>
        <Skeleton variant="rounded" height={32} />
        <Skeleton variant="rounded" height={32} width="70%" />
      </Stack>
    );
  } else if (isError) {
    body = (
      <Alert
        severity="error"
        role="alert"
        action={
          onRetry && (
            <Button color="inherit" sx={{ minHeight: 48 }} onClick={onRetry}>
              Spróbuj ponownie
            </Button>
          )
        }
      >
        {errorText}
      </Alert>
    );
  } else if (isEmpty) {
    body = <Typography sx={{ fontSize: '1.125rem' }}>{emptyText}</Typography>;
  } else {
    body = children;
  }

  return (
    <Card component="section" aria-labelledby={`${id}-title`} sx={{ minWidth: 0, ...sx }}>
      <CardContent sx={{ height: '100%' }}>
        <Stack spacing={2} sx={{ height: '100%' }}>
          <Typography id={`${id}-title`} variant="h2" component="h2">
            {title}
          </Typography>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>{body}</Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
