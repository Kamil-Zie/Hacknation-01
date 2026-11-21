// T-026 UI-S-002 CropIcon: colored line icon per crop code (Kropla design), generic sprout for unknown crops
import { SvgIcon } from '@mui/material';
import type { SvgIconProps } from '@mui/material';
import type { ReactNode } from 'react';

type CropKey = 'wheat' | 'maize' | 'rapeseed' | 'potato' | 'beet' | 'grass';

const CROP_KEYS: Record<string, CropKey> = {
  winter_wheat: 'wheat',
  spring_barley: 'wheat',
  maize: 'maize',
  winter_rapeseed: 'rapeseed',
  potato: 'potato',
  sugar_beet: 'beet',
  grassland: 'grass',
};

const SHAPES: Record<CropKey | 'sprout', ReactNode> = {
  wheat: (
    <>
      <path d="M12 22V5" />
      <path d="M12 2v3" />
      <path d="M12 9c-2.6 0-4-1.6-4-4 2.6 0 4 1.6 4 4z" />
      <path d="M12 9c2.6 0 4-1.6 4-4-2.6 0-4 1.6-4 4z" />
      <path d="M12 13.5c-2.6 0-4-1.6-4-4 2.6 0 4 1.6 4 4z" />
      <path d="M12 13.5c2.6 0 4-1.6 4-4-2.6 0-4 1.6-4 4z" />
      <path d="M12 18c-2.6 0-4-1.6-4-4 2.6 0 4 1.6 4 4z" />
      <path d="M12 18c2.6 0 4-1.6 4-4-2.6 0-4 1.6-4 4z" />
    </>
  ),
  maize: (
    <>
      <path d="M12 2.5c2.2 0 3.5 3.2 3.5 7.2S14.2 17 12 17s-3.5-3.3-3.5-7.3S9.8 2.5 12 2.5z" />
      <path d="M9 7h6" />
      <path d="M8.6 10.5h6.8" />
      <path d="M9 14h6" />
      <path d="M12 3v13.5" />
      <path d="M9 13.5C6.2 15.2 5 18 5 21.5c3-.8 5.5-2.4 7-4.5" />
      <path d="M15 13.5c2.8 1.7 4 4.5 4 8-3-.8-5.5-2.4-7-4.5" />
    </>
  ),
  rapeseed: (
    <>
      <circle cx="12" cy="4.2" r="2" />
      <circle cx="8.6" cy="7.4" r="2" />
      <circle cx="15.4" cy="7.4" r="2" />
      <circle cx="12" cy="10.6" r="2" />
      <circle cx="12" cy="7.4" r="0.8" />
      <path d="M12 12.6V22" />
      <path d="M12 17.5c-2.4 0-4.2-1.2-5.2-3.2" />
      <path d="M12 19.5c2.4 0 4.2-1.2 5.2-3.2" />
    </>
  ),
  potato: (
    <>
      <path d="M4.5 9.5c1-4.2 6.2-5.4 9.3-3.2s3 6.3.8 9.2-7.3 3.8-9.3.9-1.6-4.6-.8-6.9z" />
      <path d="M15.8 13.6c2.3-1 5.2.3 5.2 3.2s-3 4.4-5.6 3.2" />
      <path d="M8.5 10h.01" />
      <path d="M11.5 13h.01" />
      <path d="M11 8.5h.01" />
      <path d="M18.5 16.5h.01" />
    </>
  ),
  beet: (
    <>
      <path d="M12 10c3.6 0 5.6 2.6 5.6 5.6S15.2 20.8 12 22c-3.2-1.2-5.6-3.4-5.6-6.4S8.4 10 12 10z" />
      <path d="M12 10V6.5" />
      <path d="M12 7C11 4 8.5 2.5 5.5 2.5c0 2.4 2.4 4.5 6.5 4.5z" />
      <path d="M12 7c1-3 3.5-4.5 6.5-4.5 0 2.4-2.4 4.5-6.5 4.5z" />
      <path d="M10 14.5c.6-.6 1.3-.9 2-.9" />
    </>
  ),
  grass: (
    <>
      <path d="M2.5 21.5h19" />
      <path d="M5 21.5c0-4.5-.8-8.5-2.5-11.5 3 2 4.3 6 4.5 11.5" />
      <path d="M10.6 21.5c0-6.5.2-12 1.4-17 1.2 5 1.4 10.5 1.4 17" />
      <path d="M17 21.5c.2-5.5 1.5-9.5 4.5-11.5-1.7 3-2.5 7-2.5 11.5" />
      <path d="M8 21.5c0-3-.6-5.5-1.8-7.5" />
      <path d="M16 21.5c0-3 .6-5.5 1.8-7.5" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 22v-9" />
      <path d="M12 13c0-4 2.5-6.5 7-6.5 0 4-2.5 6.5-7 6.5z" />
      <path d="M12 16c0-3-2-5-6-5 0 3 2 5 6 5z" />
    </>
  ),
};

interface CropIconProps extends Omit<SvgIconProps, 'children'> {
  cropCode: string;
}

export function CropIcon({ cropCode, sx, ...rest }: CropIconProps) {
  const key = CROP_KEYS[cropCode];
  return (
    <SvgIcon
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      sx={[
        { fontSize: 44, fill: 'none', color: (theme) => theme.palette.kropla.crop[key ?? 'grass'] },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {SHAPES[key ?? 'sprout']}
    </SvgIcon>
  );
}
