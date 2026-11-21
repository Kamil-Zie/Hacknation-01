// UI-C-003 ParcelSummaryCard: parcel number, region, commune, county, voivodeship, area
import { Box, Card, CardContent, Typography } from '@mui/material';

import type { Parcel } from '@/api/parcels';

interface ParcelSummaryCardProps {
  parcel: Parcel;
}

export function ParcelSummaryCard({ parcel }: ParcelSummaryCardProps) {
  const rows: [string, string][] = [
    ['Numer działki', parcel.parcelNumber],
    ['Obręb', parcel.region],
    ['Gmina', parcel.commune],
    ['Powiat', parcel.county],
    ['Województwo', parcel.voivodeship],
    ['Powierzchnia', `${parcel.areaHa.toLocaleString('pl-PL')} ha`],
  ];
  return (
    <Card variant="outlined" component="section" aria-label="Podsumowanie działki">
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom sx={{ overflowWrap: 'anywhere' }}>
          Działka {parcel.id}
        </Typography>
        <Box
          component="dl"
          sx={{ m: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, columnGap: 2 }}
        >
          {rows.map(([label, value]) => (
            <Box key={label} sx={{ display: 'contents' }}>
              <Typography component="dt" variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography component="dd" variant="body1" sx={{ m: 0, fontWeight: 600 }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Źródło: {parcel.source}
        </Typography>
      </CardContent>
    </Card>
  );
}
