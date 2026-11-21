// UI-S-003 SectionCard: framed report section with title, subtitle and content (design Kropla)
import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export interface SectionCardProps {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function SectionCard({ id, title, subtitle, children }: SectionCardProps) {
  return (
    <Box
      component="section"
      id={id}
      aria-labelledby={`${id}-title`}
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'kropla.line',
        borderRadius: '18px',
        px: { xs: 2, md: 2.75 },
        pt: { xs: 2.5, md: 2.75 },
        pb: { xs: 2.5, md: 2.75 },
        scrollMarginTop: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Typography
          id={`${id}-title`}
          variant="h3"
          component="h3"
          sx={{ fontSize: '1.625rem', fontWeight: 800 }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ fontSize: '1.125rem' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {children}
    </Box>
  );
}
