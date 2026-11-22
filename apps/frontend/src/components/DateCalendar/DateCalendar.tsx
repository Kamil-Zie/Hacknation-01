// UI-S-002 T-103 DateCalendar: month grid for the analysis date (no extra library), today selected by default, days outside min–max disabled
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, ButtonBase, IconButton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useState } from 'react';
import type { KeyboardEvent } from 'react';

export interface DateCalendarProps {
  /** YYYY-MM-DD */
  value: string;
  /** YYYY-MM-DD, earliest day that can be picked */
  min: string;
  /** YYYY-MM-DD, latest day that can be picked (today) */
  max: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
const MONTH_FORMAT = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' });
const LONG_FORMAT = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return { y, m: m - 1, d };
};
const localDate = (iso: string) => {
  const { y, m, d } = parse(iso);
  return new Date(y, m, d);
};

export function formatLongDate(iso: string): string {
  return LONG_FORMAT.format(localDate(iso));
}

export function DateCalendar({ value, min, max, disabled = false, onChange }: DateCalendarProps) {
  const selected = parse(value);
  const [view, setView] = useState({ y: selected.y, m: selected.m });
  const minP = parse(min);
  const maxP = parse(max);

  const firstWeekday = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthIndex = (y: number, m: number) => y * 12 + m;
  const canPrev = monthIndex(view.y, view.m) > monthIndex(minP.y, minP.m);
  const canNext = monthIndex(view.y, view.m) < monthIndex(maxP.y, maxP.m);
  const shift = (delta: number) => {
    const date = new Date(view.y, view.m + delta, 1);
    setView({ y: date.getFullYear(), m: date.getMonth() });
  };

  const inRange = (iso: string) => iso >= min && iso <= max;

  // arrow keys move the selection by a day / a week, staying in range
  function handleKey(event: KeyboardEvent, iso: string) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (!step) return;
    event.preventDefault();
    const date = localDate(iso);
    date.setDate(date.getDate() + step);
    const next = toIso(date.getFullYear(), date.getMonth(), date.getDate());
    if (!inRange(next)) return;
    onChange(next);
    setView({ y: date.getFullYear(), m: date.getMonth() });
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus(),
    );
  }

  const today = max;
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'kropla.line',
        borderRadius: '16px',
        bgcolor: 'background.paper',
        p: { xs: 1.5, md: 2 },
        width: '100%',
        maxWidth: 440,
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <IconButton
          aria-label="Poprzedni miesiąc"
          onClick={() => shift(-1)}
          disabled={!canPrev || disabled}
          sx={{ width: 48, height: 48 }}
        >
          <ChevronLeftIcon />
        </IconButton>
        <Typography
          aria-live="polite"
          sx={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'capitalize' }}
        >
          {MONTH_FORMAT.format(new Date(view.y, view.m, 1))}
        </Typography>
        <IconButton
          aria-label="Następny miesiąc"
          onClick={() => shift(1)}
          disabled={!canNext || disabled}
          sx={{ width: 48, height: 48 }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      <Box
        role="grid"
        aria-label="Kalendarz"
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5 }}
      >
        {WEEKDAYS.map((day) => (
          <Typography
            key={day}
            role="columnheader"
            sx={{
              textAlign: 'center',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'text.secondary',
              py: 0.5,
            }}
          >
            {day}
          </Typography>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <Box key={`empty-${index}`} />;
          const iso = toIso(view.y, view.m, day);
          const isSelected = iso === value;
          const isToday = iso === today;
          const isDisabled = disabled || !inRange(iso);
          return (
            <ButtonBase
              key={iso}
              data-day={iso}
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`${formatLongDate(iso)}${isToday ? ' (dziś)' : ''}`}
              tabIndex={isSelected ? 0 : -1}
              disabled={isDisabled}
              onClick={() => onChange(iso)}
              onKeyDown={(event) => handleKey(event, iso)}
              sx={(theme) => ({
                aspectRatio: '1',
                minHeight: 44,
                borderRadius: '12px',
                fontSize: '1.125rem',
                fontWeight: isSelected || isToday ? 800 : 500,
                color: isSelected ? theme.palette.primary.contrastText : 'text.primary',
                bgcolor: isSelected ? theme.palette.primary.main : 'transparent',
                border:
                  isToday && !isSelected
                    ? `2px solid ${theme.palette.primary.main}`
                    : '2px solid transparent',
                transition: 'background-color 120ms, transform 120ms',
                '&:hover': {
                  bgcolor: isSelected
                    ? theme.palette.primary.main
                    : alpha(theme.palette.primary.main, 0.15),
                  transform: 'translateY(-1px)',
                },
                '&.Mui-disabled': { color: 'text.disabled', opacity: 0.45 },
                '&.Mui-focusVisible': {
                  outline: `3px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                },
              })}
            >
              {day}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}
