// UI-C-011 KbwChart: water balance (KBW) series against the 10-year p10-p90 band and p50 median, 30/60 day window
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

import type { Report } from '@/api/types';
import { formatNumber, formatSigned } from '@/utils/format';

interface KbwChartProps {
  charts: Report['charts'];
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

export function KbwChart({ charts }: KbwChartProps) {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));
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
        `Ostatnia wartość KBW (${formatDayMonth(lastRow.date)}): ${formatNumber(lastRow.kbw)} mm. ` +
        `Mediana wielolecia: ${formatNumber(lastRow.p50)} mm, różnica ${formatSigned(diff)} mm. ` +
        (belowP10
          ? `Wartość jest poniżej dolnego decyla normy (${formatNumber(lastRow.p10)} mm).`
          : 'Wartość nie spada poniżej dolnego decyla normy.');
    } else {
      summary = `Ostatnia wartość KBW (${formatDayMonth(lastRow.date)}): ${formatNumber(lastRow.kbw)} mm.`;
    }
  }
  const ariaLabel = `Wykres klimatycznego bilansu wodnego z ostatnich ${windowDays} dni, trend ${trend}. ${summary}`;

  const dates = visible.map((row) => row.date);
  // ~5 date labels on phones, ~9 on wider screens, whatever the point density (weekly mock vs daily API)
  const labelStep = Math.max(1, Math.ceil(visible.length / (isNarrow ? 5 : 9)));
  const showSeriesMarks = visible.length <= 20;
  const hidden = { display: 'none' };

  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Typography variant="body2" color="text.secondary">
          Klimatyczny bilans wodny (KBW), mm
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={windowDays}
          aria-label="Okno czasowe wykresu"
          onChange={(_, value: WindowDays | null) => {
            if (value) setWindowDays(value);
          }}
        >
          <ToggleButton value={30} sx={{ minWidth: 64, minHeight: 44 }}>
            30 dni
          </ToggleButton>
          <ToggleButton value={60} sx={{ minWidth: 64, minHeight: 44 }}>
            60 dni
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Box
        role="img"
        aria-label={ariaLabel}
        sx={{
          width: '100%',
          height: { xs: 220, md: 300 },
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
              label: 'Data (dd.MM)',
              valueFormatter: (value: string) => formatDayMonth(value),
              tickLabelInterval: (_value: string, index: number) => index % labelStep === 0,
            },
          ]}
          yAxis={[{ id: 'y', label: 'KBW (mm)', valueFormatter: (value: number) => `${value} mm` }]}
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
              label: 'Mediana normy 10 lat',
              color: theme.palette.text.secondary,
            },
            {
              id: 'kbw',
              dataKey: 'kbw',
              showMark: showSeriesMarks,
              connectNulls: true,
              label: 'KBW (bieżący sezon)',
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

      <Stack
        component="ul"
        direction="row"
        spacing={1.5}
        useFlexGap
        sx={{ listStyle: 'none', m: 0, p: 0, flexWrap: 'wrap', columnGap: 2 }}
        aria-label="Legenda wykresu"
      >
        {/* Short labels with line glyphs: fits ~2 lines on 360 px (frontend-2 review) */}
        <Typography component="li" variant="caption" sx={{ whiteSpace: 'nowrap' }}>
          <strong aria-hidden>━</strong> KBW sezonu (linia ciągła)
        </Typography>
        <Typography component="li" variant="caption" sx={{ whiteSpace: 'nowrap' }}>
          <strong aria-hidden>┅</strong> mediana 10 lat (przerywana)
        </Typography>
        <Typography component="li" variant="caption" sx={{ whiteSpace: 'nowrap' }}>
          <strong aria-hidden>▒</strong> pasmo p10–p90
        </Typography>
        <Typography component="li" variant="caption" sx={{ whiteSpace: 'nowrap' }}>
          <strong aria-hidden>─</strong> 0 mm
        </Typography>
      </Stack>

      <Typography variant="body2">{summary}</Typography>
    </Stack>
  );
}
