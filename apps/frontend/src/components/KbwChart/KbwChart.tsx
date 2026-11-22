// UI-C-011 KbwChart: rolling 60-day water balance (KBW60) per day against the 10-year p10-p90 band and p50 median; the toggle only changes the visible period
import {
  Alert,
  Box,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ChartsReferenceLine, LineChart } from '@mui/x-charts';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { Report } from '@/api/types';
import { srOnly } from '@/app/a11yStyles';
import { formatNumber, formatSigned } from '@/utils/format';

interface KbwChartProps {
  charts: Report['charts'];
  /** T-103: on lg+ fill the parent's height (dashboard one-screen layout) in a compact layout */
  fill?: boolean;
  /** heading shown above the chart (in compact mode in one row with the period toggle) */
  title?: ReactNode;
}

type WindowDays = 30 | 60;

const DAY_MS = 24 * 60 * 60 * 1000;

function toTime(date: string): number {
  return new Date(`${date}T00:00:00`).getTime();
}

function formatDayMonth(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}.${month}`;
}

type SwatchKind = 'line' | 'dashed' | 'band' | 'zero';

const LEGEND: { kind: SwatchKind; label: string }[] = [
  { kind: 'line', label: 'Bilans wody w tym sezonie' },
  { kind: 'dashed', label: 'Norma z 10 lat' },
  { kind: 'band', label: 'Zwykły zakres (z 10 lat)' },
  { kind: 'zero', label: 'Zero: wody tyle, ile ubywa' },
];

function LegendSwatch({ kind }: { kind: SwatchKind }) {
  const theme = useTheme();
  if (kind === 'band') {
    return (
      <Box
        sx={{
          width: 40,
          height: 16,
          borderRadius: '3px',
          bgcolor: theme.palette.secondary.main,
          opacity: 0.7,
          border: 1,
          borderColor: 'kropla.line',
        }}
      />
    );
  }
  const color = kind === 'line' ? theme.palette.primary.main : theme.palette.text.primary;
  return (
    <Box
      sx={{
        width: 40,
        height: 0,
        borderTop: `${kind === 'line' ? 4 : 3}px ${kind === 'dashed' ? 'dashed' : 'solid'} ${
          kind === 'dashed' ? theme.palette.text.secondary : color
        }`,
      }}
    />
  );
}

export function KbwChart({ charts, fill = false, title }: KbwChartProps) {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const compact = fill && isDesktop;
  const [windowDays, setWindowDays] = useState<WindowDays>(60);

  const rows = useMemo(() => {
    if (!charts || charts.kbw60Series.length === 0 || charts.kbw60Climatology.length === 0) {
      return [];
    }
    const climatologyByDate = new Map(charts.kbw60Climatology.map((point) => [point.date, point]));
    const seriesByDate = new Map(charts.kbw60Series.map((point) => [point.date, point.kbwMm]));
    const dates = [...new Set([...seriesByDate.keys(), ...climatologyByDate.keys()])].sort();
    return dates.map((date) => {
      const norm = climatologyByDate.get(date);
      return {
        date,
        kbw: seriesByDate.get(date) ?? null,
        p10: norm?.p10 ?? null,
        band: norm ? norm.p90 - norm.p10 : null,
        p50: norm?.p50 ?? null,
      };
    });
  }, [charts]);

  if (rows.length === 0) {
    return <Alert severity="info">Brak danych do wykresu bilansu wodnego</Alert>;
  }

  const lastSeriesDate =
    [...rows].reverse().find((row) => row.kbw !== null)?.date ?? rows[rows.length - 1].date;
  const cutoff = toTime(lastSeriesDate) - (windowDays - 1) * DAY_MS;
  // Live API sends 90 daily points (T-038), so both windows cut from the last series date
  const visible = rows.filter((row) => toTime(row.date) >= cutoff);
  const lastRow = [...visible].reverse().find((row) => row.kbw !== null);

  let summary = 'Brak wartości KBW w wybranym oknie.';
  let trend = 'brak danych';
  if (lastRow && lastRow.kbw !== null) {
    const first = visible.find((row) => row.kbw !== null);
    if (first && first.kbw !== null && first !== lastRow) {
      const change = lastRow.kbw - first.kbw;
      trend = change > 1 ? 'rosnący' : change < -1 ? 'malejący' : 'stabilny';
    }
    if (lastRow.p50 !== null && lastRow.p10 !== null) {
      const diff = lastRow.kbw - lastRow.p50;
      const belowP10 = lastRow.kbw < lastRow.p10;
      summary =
        `Bilans z 60 dni na ${formatDayMonth(lastRow.date)}: ${formatNumber(lastRow.kbw)} mm. ` +
        `Mediana wielolecia: ${formatNumber(lastRow.p50)} mm, różnica ${formatSigned(diff)} mm. ` +
        (belowP10
          ? `Wartość jest poniżej dolnego decyla normy (${formatNumber(lastRow.p10)} mm).`
          : 'Wartość nie spada poniżej dolnego decyla normy.');
    } else {
      summary = `Bilans z 60 dni na ${formatDayMonth(lastRow.date)}: ${formatNumber(lastRow.kbw)} mm.`;
    }
  }
  const ariaLabel = `Wykres bilansu wody liczonego z 60 dni, pokazany za ostatnie ${windowDays} dni, trend ${trend}. ${summary}`;

  const dates = visible.map((row) => row.date);
  // ~5 date labels on phones, ~9 on wider screens, whatever the point density (weekly mock vs daily API)
  const labelStep = Math.max(1, Math.ceil(visible.length / (isNarrow ? 5 : 9)));
  const showSeriesMarks = visible.length <= 20;
  const hidden = { display: 'none' };

  const legend = (
    <Box
      component="ul"
      aria-label="Legenda wykresu"
      sx={{
        listStyle: 'none',
        m: 0,
        p: 0,
        display: 'grid',
        gridTemplateColumns: compact
          ? 'minmax(0, 1fr)'
          : { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
        justifyContent: 'start',
        gap: compact ? 0.5 : 1,
        columnGap: 3,
      }}
    >
      {LEGEND.map((item) => (
        <Box
          key={item.label}
          component="li"
          sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minHeight: compact ? 28 : 32 }}
        >
          <Box aria-hidden sx={{ flex: '0 0 40px', display: 'flex', alignItems: 'center' }}>
            <LegendSwatch kind={item.kind} />
          </Box>
          <Typography sx={{ fontSize: compact ? '1rem' : '1.125rem', lineHeight: 1.3 }}>
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );

  const toggle = (
    <ToggleButtonGroup
      exclusive
      size="small"
      color="primary"
      value={windowDays}
      aria-label="Pokazany okres"
      onChange={(_, value: WindowDays | null) => {
        if (value) setWindowDays(value);
      }}
    >
      <ToggleButton value={30} sx={{ minWidth: 64, minHeight: 48, fontSize: '1rem' }}>
        Ostatni miesiąc
      </ToggleButton>
      <ToggleButton value={60} sx={{ minWidth: 64, minHeight: 48, fontSize: '1rem' }}>
        Ostatnie 2 miesiące
      </ToggleButton>
    </ToggleButtonGroup>
  );

  const chart = (
    <Box
      role="img"
      aria-label={ariaLabel}
      sx={{
        width: '100%',
        height: compact ? '100%' : { xs: 220, md: 300 },
        ...(compact && { flex: '1 1 0', minWidth: 0, minHeight: 120 }),
        overflow: 'hidden',
        '& .MuiLineElement-series-p10': hidden,
        '& .MuiMarkElement-series-p10': hidden,
        '& .MuiLineElement-series-band': hidden,
        '& .MuiMarkElement-series-band': hidden,
        '& .MuiAreaElement-series-band': { fill: theme.palette.secondary.main, fillOpacity: 0.7 },
        '& .MuiLineElement-series-p50': { strokeDasharray: '6 4', strokeWidth: 2 },
        '& .MuiLineElement-series-kbw': { strokeWidth: 3 },
      }}
    >
      <LineChart
        // left margin leaves room for y tick labels like "-100 mm"
        margin={{ top: 12, right: 16, bottom: 28, left: 72 }}
        tooltip={{ trigger: 'none' }}
        skipAnimation
        slotProps={{ legend: { hidden: true } }}
        dataset={visible}
        xAxis={[
          {
            id: 'x',
            dataKey: 'date',
            scaleType: 'point',
            data: dates,
            // compact: no room under the ticks for the axis label; the dates speak for themselves
            label: compact ? undefined : 'Data (dd.MM)',
            valueFormatter: (value: string) => formatDayMonth(value),
            tickLabelInterval: (_value: string, index: number) => index % labelStep === 0,
          },
        ]}
        yAxis={[{ id: 'y', valueFormatter: (value: number) => `${value} mm` }]}
        series={[
          { id: 'p10', dataKey: 'p10', stack: 'norm', showMark: false, label: 'p10' },
          {
            id: 'band',
            dataKey: 'band',
            stack: 'norm',
            area: true,
            showMark: false,
            label: 'Pasmo normy',
          },
          {
            id: 'p50',
            dataKey: 'p50',
            showMark: false,
            label: 'Norma z 10 lat',
            color: theme.palette.text.secondary,
          },
          {
            id: 'kbw',
            dataKey: 'kbw',
            showMark: showSeriesMarks,
            connectNulls: true,
            label: 'Bilans wody',
            color: theme.palette.primary.main,
            valueFormatter: (value: number | null) =>
              value === null ? '' : `${formatNumber(value)} mm`,
          },
        ]}
      >
        <ChartsReferenceLine
          y={0}
          lineStyle={{ stroke: theme.palette.text.primary, strokeWidth: 1.5 }}
        />
      </LineChart>
    </Box>
  );

  // compact (dashboard, lg+): title and toggle in one row, chart fills the rest with the legend
  // and the summary in a narrow column on its right; the long description goes to screen readers
  if (compact) {
    return (
      <Stack spacing={1} sx={{ height: '100%', minHeight: 0 }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}
        >
          <Box sx={{ minWidth: 0 }}>{title}</Box>
          {toggle}
        </Stack>
        <Typography sx={srOnly}>
          Bilans wody z 60 dni (KBW), mm. Każdy punkt to suma z poprzednich 60 dni.
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, flex: '1 1 0', minHeight: 0 }}>
          {chart}
          <Box sx={{ flex: '0 0 auto', maxWidth: 300, alignSelf: 'flex-start' }}>{legend}</Box>
          {/* the numeric summary does not fit next to the chart; screen readers still get it */}
          <Typography sx={srOnly}>{summary}</Typography>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      {title}
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Stack spacing={0.25}>
          <Typography color="text.secondary" sx={{ fontSize: '1.125rem' }}>
            Bilans wody z 60 dni (KBW), mm
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '1rem' }}>
            Każdy punkt to suma z poprzednich 60 dni. Przełącznik zmienia tylko pokazany okres.
          </Typography>
        </Stack>
        {toggle}
      </Stack>
      {legend}
      {chart}
      <Typography sx={{ fontSize: '1.125rem' }}>{summary}</Typography>
    </Stack>
  );
}
