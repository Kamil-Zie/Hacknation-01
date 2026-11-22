// UI-S-002 T-103 DateCalendar: month grid for the analysis date (no extra library); month and year lists, grid lines, today selected by default, days outside min–max disabled
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, ButtonBase, IconButton, MenuItem, Stack, TextField } from '@mui/material';
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
const MONTHS = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];
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
const monthIndex = (y: number, m: number) => y * 12 + m;

export function formatLongDate(iso: string): string {
  return LONG_FORMAT.format(localDate(iso));
}

const selectSx = {
  '& .MuiInputBase-root': { minHeight: 48, fontSize: '1.125rem', fontWeight: 700 },
} as const;

export function DateCalendar({ value, min, max, disabled = false, onChange }: DateCalendarProps) {
  const selected = parse(value);
  const [view, setView] = useState({ y: selected.y, m: selected.m });
  const minP = parse(min);
  const maxP = parse(max);

  // keep the shown month inside min–max (e.g. after picking a year)
  const clampView = (y: number, m: number) => {
    const index = Math.min(
      Math.max(monthIndex(y, m), monthIndex(minP.y, minP.m)),
      monthIndex(maxP.y, maxP.m),
    );
    return { y: Math.floor(index / 12), m: index % 12 };
  };
  const showMonth = (y: number, m: number) => setView(clampView(y, m));

  const firstWeekday = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null); // full last week, so the grid lines close

  const canPrev = monthIndex(view.y, view.m) > monthIndex(minP.y, minP.m);
  const canNext = monthIndex(view.y, view.m) < monthIndex(maxP.y, maxP.m);
  const years = Array.from({ length: maxP.y - minP.y + 1 }, (_, i) => maxP.y - i);
  const monthAllowed = (m: number) =>
    monthIndex(view.y, m) >= monthIndex(minP.y, minP.m) &&
    monthIndex(view.y, m) <= monthIndex(maxP.y, maxP.m);

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
        maxWidth: 520,
      }}
    >
      {/* header: ‹ [month ▾] [year ▾] › */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <IconButton
          aria-label="Poprzedni miesiąc"
          onClick={() => showMonth(view.y, view.m - 1)}
          disabled={!canPrev || disabled}
          sx={{ width: 48, height: 48, border: 1, borderColor: 'kropla.line' }}
        >
          <ChevronLeftIcon />
        </IconButton>
        <TextField
          select
          label="Miesiąc"
          value={view.m}
          disabled={disabled}
          onChange={(event) => showMonth(view.y, Number(event.target.value))}
          sx={{ ...selectSx, flex: '1 1 0' }}
        >
          {MONTHS.map((name, m) => (
            <MenuItem key={name} value={m} disabled={!monthAllowed(m)} sx={{ minHeight: 44 }}>
              {name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Rok"
          value={view.y}
          disabled={disabled}
          onChange={(event) => showMonth(Number(event.target.value), view.m)}
          sx={{ ...selectSx, flex: '0 0 112px' }}
        >
          {years.map((y) => (
            <MenuItem key={y} value={y} sx={{ minHeight: 44 }}>
              {y}
            </MenuItem>
          ))}
        </TextField>
        <IconButton
          aria-label="Następny miesiąc"
          onClick={() => showMonth(view.y, view.m + 1)}
          disabled={!canNext || disabled}
          sx={{ width: 48, height: 48, border: 1, borderColor: 'kropla.line' }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      {/* grid: 1 px gaps on a divider-coloured background draw the lines between days */}
      <Box
        role="grid"
        aria-label={`Kalendarz: ${MONTHS[view.m]} ${view.y}`}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: '1px',
          bgcolor: 'divider',
          border: 1,
          borderColor: 'divider',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {WEEKDAYS.map((day, index) => (
          <Box
            key={day}
            role="columnheader"
            sx={{
              textAlign: 'center',
              fontSize: '1rem',
              fontWeight: 800,
              py: 1,
              bgcolor: 'kropla.tint',
              color: index >= 5 ? 'primary.main' : 'text.secondary',
            }}
          >
            {day}
          </Box>
        ))}
        {cells.map((day, index) => {
          if (day === null) {
            // days of other months: plain background, only the grid lines show
            return <Box key={`empty-${index}`} sx={{ bgcolor: 'background.paper' }} />;
          }
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
                // square cells; tabular digits and one font weight on hover, so numbers do not move
                aspectRatio: '1',
                minHeight: 44,
                fontSize: '1.125rem',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: isSelected || isToday ? 800 : 600,
                color: isSelected ? theme.palette.primary.contrastText : 'text.primary',
                bgcolor: isSelected ? theme.palette.primary.main : theme.palette.background.paper,
                // today: ring inside the cell (the grid lines stay straight)
                boxShadow:
                  isToday && !isSelected ? `inset 0 0 0 3px ${theme.palette.primary.main}` : 'none',
                transition: 'background-color 120ms, box-shadow 120ms',
                '&:hover': {
                  bgcolor: isSelected
                    ? theme.palette.primary.main
                    : alpha(theme.palette.primary.main, 0.2),
                  boxShadow: `inset 0 0 0 3px ${theme.palette.primary.main}`,
                },
                '&.Mui-disabled': {
                  color: 'text.disabled',
                  bgcolor: theme.palette.action.hover,
                  textDecoration: 'line-through',
                  textDecorationColor: alpha(theme.palette.text.primary, 0.25),
                },
                '&.Mui-focusVisible': {
                  outline: `3px solid ${theme.palette.primary.main}`,
                  outlineOffset: -3,
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
