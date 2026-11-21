// UI-S-003 Report header
import { Alert, Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import type { Report } from '@/api/types';
import { formatDate, formatDateTime, formatNumber } from '@/utils/format';

interface ReportHeaderProps {
  report: Report;
  actions?: ReactNode;
}

export function ReportHeader({ report, actions }: ReportHeaderProps) {
  const { parcel, crop, status } = report;
  const place = [
    `obręb ${parcel.region}`,
    `gmina ${parcel.commune}`,
    `powiat ${parcel.county}`,
    `woj. ${parcel.voivodeship}`,
    `${formatNumber(parcel.areaHa, 1)} ha`,
  ].join(', ');

  return (
    <Stack spacing={1.5} component="header">
      <Box
        sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Typography variant="h1" component="h1" sx={{ overflowWrap: 'anywhere' }}>
          Raport wody: działka {parcel.parcelNumber}
        </Typography>
        {/* Slot for ReportActions (T-023), visible from lg */}
        <Box sx={{ display: { xs: 'none', lg: 'block' }, flexShrink: 0 }}>{actions}</Box>
      </Box>
      <Typography color="text.secondary">{place}</Typography>
      <Typography sx={{ fontWeight: 600 }}>Uprawa: {crop.name}</Typography>
      <Typography variant="caption" color="text.secondary">
        Stan na {formatDate(report.analysisDate)}. Wygenerowano {formatDateTime(report.computedAt)}.
      </Typography>
      {status === 'partial' && (
        <Alert severity="info">
          Część źródeł nie odpowiedziała. Szczegóły w sekcji Źródła i ograniczenia.
        </Alert>
      )}
    </Stack>
  );
}
