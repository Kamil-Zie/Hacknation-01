// UI-C-006 CardGrid: 3-column card grid (6-col base), last incomplete row stretched, 1 column under 900 px
import { Box } from '@mui/material';
import { Children } from 'react';
import type { ReactNode } from 'react';

export interface CardGridProps {
  children: ReactNode;
  /** Full-width card under the grid (e.g. "Faza uprawy") */
  footer?: ReactNode;
}

const COLUMNS = 3;
const BASE_SPAN = 2;
const FULL_SPAN = 6;

function spanFor(index: number, count: number): number {
  const rest = count % COLUMNS;
  if (rest === 0 || index < count - rest) return BASE_SPAN;
  return FULL_SPAN / rest;
}

export function CardGrid({ children, footer }: CardGridProps) {
  const items = Children.toArray(children);
  return (
    <Box
      className="card-grid"
      sx={{
        display: 'grid',
        gap: 2,
        alignItems: 'start',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(6, minmax(0, 1fr))' },
      }}
    >
      {items.map((item, index) => (
        <Box
          key={index}
          className="card-grid-item"
          sx={{
            minWidth: 0,
            gridColumn: { xs: 'auto', md: `span ${spanFor(index, items.length)}` },
          }}
        >
          {item}
        </Box>
      ))}
      {footer && (
        <Box
          className="card-grid-item card-grid-full"
          sx={{ minWidth: 0, gridColumn: { xs: 'auto', md: `span ${FULL_SPAN}` } }}
        >
          {footer}
        </Box>
      )}
    </Box>
  );
}
