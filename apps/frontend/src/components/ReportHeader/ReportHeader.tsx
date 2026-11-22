// UI-S-003 Report header: step kicker, title, actions slot, place and crop chip (design Kropla)
import EventIcon from '@mui/icons-material/EventOutlined';
import GrassIcon from '@mui/icons-material/Grass';
import { Alert, Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import type { CropCode, Report } from '@/api/types';
import { formatDate, formatNumber } from '@/utils/format';

interface ReportHeaderProps {
  report: Report;
  /** Buttons shown right of the title (ReportActions) */
  actions?: ReactNode;
  kicker?: string;
}

type CropColor = 'wheat' | 'maize' | 'rapeseed' | 'potato' | 'beet' | 'grass';

const CROP_COLOR: Record<CropCode, CropColor> = {
  winter_wheat: 'wheat',
  spring_barley: 'wheat',
  maize: 'maize',
  potato: 'potato',
  winter_rapeseed: 'rapeseed',
  sugar_beet: 'beet',
  grassland: 'grass',
};

export function ReportHeader({
  report,
  actions,
  kicker = 'KROK 3 Z 3 · RAPORT',
}: ReportHeaderProps) {
  const { parcel, crop, status } = report;
  const place = `obręb ${parcel.region}, gmina ${parcel.commune}, powiat ${parcel.county}, woj. ${parcel.voivodeship}`;
  const cropColor = CROP_COLOR[crop.code as CropCode] ?? 'grass';

  return (
    <Box component="header" sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px 32px',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: 'primary.main' }}>
            {kicker}
          </Typography>
          {/* T-108 report date as the first stand-out element of the header (read once, here) */}
          <Box
            sx={(theme) => ({
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              my: 1,
              px: 2,
              py: 0.75,
              borderRadius: 9999,
              bgcolor: theme.palette.kropla.tint,
              border: `2px solid ${theme.palette.primary.main}`,
              color: 'text.primary',
              fontSize: { xs: '1.125rem', md: '1.25rem' },
              fontWeight: 800,
            })}
          >
            <EventIcon aria-hidden sx={{ color: 'primary.main' }} />
            Raport na dzień {formatDate(report.analysisDate)}
          </Box>
          <Typography variant="h1" component="h1" sx={{ overflowWrap: 'anywhere' }}>
            Raport wody: działka {parcel.parcelNumber}
          </Typography>
        </Box>
        {actions}
      </Box>
      <Typography
        color="text.secondary"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '6px 10px',
          fontSize: { xs: '1.0625rem', md: '1.1875rem' },
        }}
      >
        <span>
          {place} · <b style={{ fontWeight: 700 }}>{formatNumber(parcel.areaHa, 1)} ha</b>
        </span>
      </Typography>
      <Box>
        <Box
          component="span"
          sx={(theme) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: 9999,
            bgcolor: 'background.paper',
            border: `2px solid ${theme.palette.kropla.crop[cropColor]}`,
            fontSize: '1.125rem',
            fontWeight: 700,
          })}
        >
          <GrassIcon
            aria-hidden
            sx={(theme) => ({ color: theme.palette.kropla.crop[cropColor] })}
          />
          {crop.name}
        </Box>
      </Box>
      {status === 'partial' && (
        <Alert severity="info">
          Część źródeł nie odpowiedziała. Szczegóły w sekcji „Skąd mamy dane?”.
        </Alert>
      )}
    </Box>
  );
}
