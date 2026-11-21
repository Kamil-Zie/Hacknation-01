// UI-C-006 MetricCard: collapsible report card (title, big number, caption, state label, "Pokaż więcej")
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import { AlertLabel } from '@/components/AlertLabel/AlertLabel';
import { MoreButton } from '@/components/MoreButton/MoreButton';
import type { AlertLevel } from '@/utils/reportState';

export interface MetricCardProps {
  title: string;
  /** Big number, e.g. "−122 mm" */
  value?: string;
  caption?: string;
  /** Date or period under the caption */
  period?: string;
  alert?: { level: AlertLevel; label: string };
  /** Put the state label above the button on the right instead of beside the title */
  isAlertAboveButton?: boolean;
  /** Hint text under the title (location etc.), visible without expanding */
  note?: string;
  /** Detail content; without it the card is not collapsible */
  children?: ReactNode;
  /** Reason shown instead of the value when the data are missing */
  missingReason?: string;
}

const cardSx = {
  bgcolor: 'background.paper',
  border: 1,
  borderColor: 'kropla.line',
  borderRadius: '16px',
  px: 2.5,
  minWidth: 0,
} as const;

function Head({ title, alert, isAlertAboveButton }: MetricCardProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      <Typography
        component="h4"
        sx={{
          fontSize: '1.1875rem',
          lineHeight: 1.4,
          fontWeight: 700,
          minWidth: 0,
          flex: '1 1 8rem',
        }}
      >
        {title}
      </Typography>
      {alert && !isAlertAboveButton && <AlertLabel level={alert.level} label={alert.label} />}
    </Box>
  );
}

export function MetricCard(props: MetricCardProps) {
  const { value, caption, period, alert, isAlertAboveButton, note, children, missingReason } =
    props;

  if (missingReason !== undefined) {
    return (
      <Box
        component="article"
        sx={{ ...cardSx, py: 2.5, borderStyle: 'dashed', borderColor: 'drought.unknown' }}
      >
        <Head title={props.title} />
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mt: 1 }}>
          <RemoveCircleOutlineIcon sx={{ color: 'drought.unknown' }} aria-hidden />
          <Box>
            <Typography sx={{ fontWeight: 700 }} color="text.secondary">
              Brak danych
            </Typography>
            <Typography variant="caption" color="text.secondary" component="p" sx={{ m: 0 }}>
              {missingReason}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  if (children === undefined) {
    return (
      <Box
        component="article"
        sx={{ ...cardSx, py: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}
      >
        <Head {...props} />
        {value && (
          <Typography component="span" sx={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {value}
          </Typography>
        )}
        {caption && (
          <Typography component="span" color="text.secondary" sx={{ fontSize: '1.0625rem' }}>
            {caption}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box component="details" className="metric-card" sx={cardSx}>
      <Box
        component="summary"
        sx={(theme) => ({
          py: 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          cursor: 'pointer',
          listStyle: 'none',
          '&::-webkit-details-marker': { display: 'none' },
          '&:focus-visible': {
            outline: `3px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        })}
      >
        <Head {...props} />
        {note && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '1rem' }}>
            {note}
          </Typography>
        )}
        {value && (
          <Typography
            component="span"
            sx={{
              fontSize: 'clamp(1.875rem, 1.5rem + 1.2vw, 2.625rem)',
              lineHeight: 1.05,
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              overflowWrap: 'anywhere',
            }}
          >
            {value}
          </Typography>
        )}
        {caption && (
          <Typography component="span" color="text.secondary" sx={{ fontSize: '1.0625rem' }}>
            {caption}
          </Typography>
        )}
        {period && (
          <Typography component="span" color="text.secondary" sx={{ fontSize: '1rem' }}>
            {period}
          </Typography>
        )}
        {alert && isAlertAboveButton && (
          <Box sx={{ alignSelf: 'flex-end' }}>
            <AlertLabel level={alert.level} label={alert.label} />
          </Box>
        )}
        <Box sx={{ mt: 0.75, display: 'flex' }}>
          <MoreButton />
        </Box>
      </Box>
      <Box
        sx={{
          pt: 2,
          pb: 2.5,
          borderTop: 1,
          borderColor: 'kropla.line',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
