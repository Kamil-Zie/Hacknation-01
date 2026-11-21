// UI-C-009 SourcesLimitations
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import type { DataGap, SourceCategory, SourceStatus } from '@/api/types';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { formatDateTime } from '@/utils/format';
import { sourceLabel } from '@/utils/sourceLabels';

interface SourcesLimitationsProps {
  sources: SourceStatus[];
  limitations: string[];
  dataGaps: DataGap[];
  confidenceReasons: string[];
  methodologyVersion: string;
  isPrint?: boolean;
}

const CATEGORY_LABEL: Record<SourceCategory, string> = {
  spatial: 'Działka',
  meteo: 'Pogoda',
  satellite: 'Satelita',
  soil: 'Gleba',
  terrain: 'Teren',
  hydro: 'Woda',
};

function period(source: SourceStatus): string {
  if (source.dataPeriod) return source.dataPeriod;
  return source.fetchedAt ? `pobrano ${formatDateTime(source.fetchedAt)}` : '—';
}

const ROLE_LABEL = {
  current: 'dane bieżące (90 dni)',
  climatology: 'historia 10 lat',
  fallback: 'dane zapasowe',
} as const;

function roleLabel(source: SourceStatus): string | null {
  return source.role ? ROLE_LABEL[source.role] : null;
}

function SourceLink({ source }: { source: SourceStatus }) {
  return (
    <Link
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      sx={{ display: 'inline-flex', alignItems: 'center', minHeight: 44 }}
      aria-label={`${source.label}: strona źródła (otwiera się w nowej karcie)`}
    >
      strona źródła
    </Link>
  );
}

function StatusCell({ source }: { source: SourceStatus }) {
  return (
    <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
      <StatusBadge kind="source" value={source.status} size="small" />
      {source.message && <Typography variant="caption">{source.message}</Typography>}
    </Stack>
  );
}

function SourcesTable({ sources }: { sources: SourceStatus[] }) {
  return (
    <TableContainer
      sx={{
        display: { xs: 'none', md: 'block' },
        '@media print': { display: 'block', overflow: 'visible' },
        '& td, & th': { overflowWrap: 'anywhere', wordBreak: 'break-word' },
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell component="th" scope="col">
              Źródło
            </TableCell>
            <TableCell component="th" scope="col">
              Kategoria
            </TableCell>
            <TableCell component="th" scope="col">
              Okres danych
            </TableCell>
            <TableCell component="th" scope="col">
              Status
            </TableCell>
            <TableCell component="th" scope="col">
              Licencja
            </TableCell>
            <TableCell component="th" scope="col">
              Link
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sources.map((s) => (
            <TableRow key={s.sourceId}>
              <TableCell component="th" scope="row">
                <Typography sx={{ fontWeight: 600 }}>{s.label}</Typography>
                <Typography variant="caption">{s.name}</Typography>
              </TableCell>
              <TableCell>
                {CATEGORY_LABEL[s.category]}
                {roleLabel(s) && (
                  <Typography variant="caption" component="div">
                    {roleLabel(s)}
                  </Typography>
                )}
              </TableCell>
              <TableCell>{period(s)}</TableCell>
              <TableCell>
                <StatusCell source={s} />
              </TableCell>
              <TableCell>{s.license}</TableCell>
              <TableCell>
                <SourceLink source={s} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function SourceCards({ sources }: { sources: SourceStatus[] }) {
  return (
    <Box
      component="ul"
      sx={{
        m: 0,
        p: 0,
        display: { xs: 'grid', md: 'none' },
        '@media print': { display: 'none' },
        gap: 1.5,
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
      }}
    >
      {sources.map((s) => (
        <Card key={s.sourceId} component="li" variant="outlined" sx={{ listStyle: 'none' }}>
          <CardContent>
            <Stack spacing={1}>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>{s.label}</Typography>
                <Typography variant="caption">{s.name}</Typography>
              </Box>
              <StatusCell source={s} />
              <Typography variant="caption">
                {CATEGORY_LABEL[s.category]}
                {roleLabel(s) ? ` (${roleLabel(s)})` : ''} · {period(s)}
              </Typography>
              <Typography variant="caption">Licencja: {s.license}</Typography>
              <SourceLink source={s} />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <Box component="ul" sx={{ m: 0, pl: 3, maxWidth: '75ch' }}>
      {items.map((item) => (
        <Typography key={item} component="li">
          {item}
        </Typography>
      ))}
    </Box>
  );
}

export function SourcesLimitations({
  sources,
  limitations,
  dataGaps,
  confidenceReasons,
  methodologyVersion,
  isPrint = false,
}: SourcesLimitationsProps) {
  const withGaps = sources.filter((s) => s.status !== 'ok' && s.status !== 'cached').length;

  return (
    <Accordion
      disableGutters
      variant="outlined"
      expanded={isPrint ? true : undefined}
      defaultExpanded={false}
    >
      <AccordionSummary expandIcon={isPrint ? null : <ExpandMoreIcon />} sx={{ minHeight: 44 }}>
        <Stack>
          <Typography sx={{ fontWeight: 600 }}>Pokaż szczegóły źródeł</Typography>
          <Typography variant="caption">
            {sources.length} źródeł, {withGaps} z brakami
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={3}>
          <Stack spacing={1.5}>
            <Typography variant="h3" component="h3">
              Źródła danych
            </Typography>
            <SourcesTable sources={sources} />
            <SourceCards sources={sources} />
          </Stack>
          {dataGaps.length > 0 && (
            <Stack spacing={1.5}>
              <Typography variant="h3" component="h3">
                Braki danych
              </Typography>
              <Stack component="ul" spacing={1.5} sx={{ m: 0, p: 0 }}>
                {dataGaps.map((gap) => (
                  <Stack
                    key={`${gap.sourceId}-${gap.what}`}
                    component="li"
                    direction="row"
                    spacing={1}
                    sx={{ listStyle: 'none' }}
                  >
                    <InfoOutlinedIcon aria-hidden color="action" />
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>
                        {sourceLabel(gap.sourceId)}: {gap.what}
                      </Typography>
                      <Typography sx={{ maxWidth: '75ch' }}>Wpływ: {gap.impact}</Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          )}
          <Stack spacing={1.5}>
            <Typography variant="h3" component="h3">
              Dlaczego taka pewność
            </Typography>
            <BulletList items={confidenceReasons} />
          </Stack>
          <Stack spacing={1.5}>
            <Typography variant="h3" component="h3">
              Ograniczenia
            </Typography>
            <BulletList items={limitations} />
          </Stack>
          <Typography variant="caption">Metodyka: {methodologyVersion}</Typography>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
