// UI-C-009 SourcesLimitations: collapsible "Skąd mamy dane?" - sources with status icons, data gaps, limitations
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RemoveIcon from '@mui/icons-material/Remove';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { Box, Link, Typography } from '@mui/material';
import type { ElementType, ReactNode } from 'react';

import type { DataGap, SourceCategory, SourceStatus, SourceStatusValue } from '@/api/types';
import { MoreButton } from '@/components/MoreButton/MoreButton';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { formatDateTime } from '@/utils/format';
import { reasonText } from '@/utils/reasonCodes';
import { sourceLabel } from '@/utils/sourceLabels';

interface SourcesLimitationsProps {
  sources: SourceStatus[];
  limitations: string[];
  dataGaps: DataGap[];
  confidenceReasons: string[];
  methodologyVersion: string;
}

const CATEGORY_LABEL: Record<SourceCategory, string> = {
  spatial: 'Działka',
  meteo: 'Pogoda',
  satellite: 'Satelita',
  soil: 'Gleba',
  terrain: 'Teren',
  hydro: 'Woda',
};

const ROLE_LABEL = {
  current: 'dane bieżące (90 dni)',
  climatology: 'historia 10 lat',
  fallback: 'dane zapasowe',
} as const;

const STATUS_ICON: Record<SourceStatusValue, { icon: ElementType; color: string }> = {
  ok: { icon: CheckIcon, color: 'drought.none' },
  cached: { icon: CheckIcon, color: 'drought.none' },
  missing: { icon: RemoveIcon, color: 'drought.unknown' },
  error: { icon: CloseIcon, color: 'drought.severe' },
  timeout: { icon: ScheduleIcon, color: 'drought.moderate' },
};

function period(source: SourceStatus): string {
  if (source.dataPeriod) return source.dataPeriod;
  return source.fetchedAt ? `pobrano ${formatDateTime(source.fetchedAt)}` : '—';
}

function SourceRow({ source }: { source: SourceStatus }) {
  const { icon: Icon, color } = STATUS_ICON[source.status];
  const role = source.role ? ROLE_LABEL[source.role] : null;
  return (
    <Box
      component="li"
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-start',
        py: 1.5,
        borderBottom: 1,
        borderColor: 'kropla.line',
        listStyle: 'none',
      }}
    >
      <Box
        component="span"
        sx={{
          flex: '0 0 auto',
          width: 30,
          height: 30,
          mt: 0.25,
          borderRadius: 9999,
          bgcolor: color,
          color: 'common.white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon aria-hidden sx={{ fontSize: 20 }} />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
        <Typography sx={{ fontSize: '1.125rem', fontWeight: 700 }}>{source.label}</Typography>
        <Typography color="text.secondary" sx={{ fontSize: '1rem' }}>
          {source.name} · {CATEGORY_LABEL[source.category]}
          {role ? ` (${role})` : ''} · {period(source)}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <StatusBadge kind="source" value={source.status} size="small" />
          {source.message && (
            <Typography variant="caption">
              {reasonText(source.reasonCode, source.message)}
            </Typography>
          )}
        </Box>
        <Typography color="text.secondary" sx={{ fontSize: '1rem', overflowWrap: 'anywhere' }}>
          Licencja: {source.license} ·{' '}
          <Link
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${source.label}: strona źródła (otwiera się w nowej karcie)`}
          >
            strona źródła
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <Box component="ul" sx={{ m: 0, pl: 3, maxWidth: '75ch' }}>
      {items.map((item) => (
        <Typography key={item} component="li" sx={{ fontSize: '1.0625rem' }}>
          {item}
        </Typography>
      ))}
    </Box>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h3" component="h4" sx={{ fontSize: '1.25rem' }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export function SourcesLimitations({
  sources,
  limitations,
  dataGaps,
  confidenceReasons,
  methodologyVersion,
}: SourcesLimitationsProps) {
  const withGaps = sources.filter((s) => s.status !== 'ok' && s.status !== 'cached').length;

  return (
    <Box
      component="details"
      id="zrodla"
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'kropla.line',
        borderRadius: '18px',
        px: { xs: 2, md: 2.75 },
        scrollMarginTop: 16,
        minWidth: 0,
      }}
    >
      <Box
        component="summary"
        sx={(theme) => ({
          py: { xs: 2.5, md: 2.75 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          cursor: 'pointer',
          listStyle: 'none',
          '&::-webkit-details-marker': { display: 'none' },
          '&:focus-visible': {
            outline: `3px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        })}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Typography variant="h3" component="h3" sx={{ fontSize: '1.625rem', fontWeight: 800 }}>
            Skąd mamy dane?
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '1.125rem' }}>
            {sources.length} źródeł{withGaps > 0 ? ` · w ${withGaps} brakuje części danych` : ''}
          </Typography>
        </Box>
        <Box sx={{ width: { xs: '100%', md: 240 }, display: 'flex' }}>
          <MoreButton />
        </Box>
      </Box>
      <Box sx={{ pb: 2.75, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box component="ul" sx={{ m: 0, p: 0 }}>
          {sources.map((s) => (
            <SourceRow key={s.sourceId} source={s} />
          ))}
        </Box>
        {dataGaps.length > 0 && (
          <Block title="Braki danych">
            <Box
              component="ul"
              sx={{ m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}
            >
              {dataGaps.map((gap) => (
                <Box
                  key={`${gap.sourceId}-${gap.what}`}
                  component="li"
                  sx={{ display: 'flex', gap: 1, listStyle: 'none' }}
                >
                  <InfoOutlinedIcon aria-hidden color="action" />
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      {sourceLabel(gap.sourceId)}: {gap.what}
                    </Typography>
                    <Typography sx={{ maxWidth: '75ch' }}>
                      Wpływ: {reasonText(gap.reasonCode, gap.impact)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Block>
        )}
        <Block title="Dlaczego taka pewność">
          <BulletList items={confidenceReasons} />
        </Block>
        <Block title="Ograniczenia">
          <BulletList items={limitations} />
        </Block>
        <Typography variant="caption">Metodyka: {methodologyVersion}</Typography>
      </Box>
    </Box>
  );
}
