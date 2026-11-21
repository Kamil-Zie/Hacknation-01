// UI-S-001 RecentParcels: one-tap chips for the last picked parcels (saves retyping the ID on stage)
import { Chip, Stack, Typography } from '@mui/material';

import type { RecentParcel } from '@/store/recentParcels';

interface RecentParcelsProps {
  items: RecentParcel[];
  currentId: string | null;
  onSelect: (parcelId: string) => void;
}

export function RecentParcels({ items, currentId, onSelect }: RecentParcelsProps) {
  if (items.length === 0) return null;
  return (
    <Stack spacing={1} component="section" aria-labelledby="recent-parcels-title">
      <Typography id="recent-parcels-title" variant="subtitle2" color="text.secondary">
        Ostatnie działki
      </Typography>
      <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
        {items.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            title={item.id}
            clickable
            color={item.id === currentId ? 'primary' : 'default'}
            variant={item.id === currentId ? 'filled' : 'outlined'}
            onClick={() => onSelect(item.id)}
            sx={{ minHeight: 44, maxWidth: '100%', '& .MuiChip-label': { whiteSpace: 'normal' } }}
          />
        ))}
      </Stack>
    </Stack>
  );
}
