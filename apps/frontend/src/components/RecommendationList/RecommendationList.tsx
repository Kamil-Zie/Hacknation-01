// UI-C-008 RecommendationList
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';

import type { DataGap, Recommendation, RecommendationCategory, Severity } from '@/api/types';
import { formatNumber } from '@/utils/format';
import { formatEvidence } from '@/utils/sourceLabels';

interface RecommendationListProps {
  recommendations: Recommendation[];
  dataGaps: DataGap[];
  isPrint?: boolean;
}

const GROUPS: { category: RecommendationCategory; title: string }[] = [
  { category: 'retention_landscape', title: 'Retencja w krajobrazie' },
  { category: 'retention_soil', title: 'Retencja w glebie' },
  { category: 'agrotechnics', title: 'Agrotechnika' },
  { category: 'irrigation', title: 'Nawadnianie' },
];

const PRIORITY_LABEL: Record<Severity, string> = {
  high: 'Priorytet wysoki',
  medium: 'Priorytet średni',
  low: 'Priorytet niski',
};

function Field({ label, children }: { label: string; children: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 700 }} component="p">
        {label}
      </Typography>
      <Typography sx={{ m: 0, maxWidth: '75ch' }}>{children}</Typography>
    </Box>
  );
}

function IrrigationBlock({ item }: { item: NonNullable<Recommendation['irrigation']> }) {
  if (!item.isJustified) {
    return <Typography sx={{ fontWeight: 600 }}>Nawadnianie teraz nie jest potrzebne</Typography>;
  }
  return (
    <Stack spacing={0.5}>
      <Typography sx={{ fontWeight: 700 }}>Nawadnianie jest uzasadnione</Typography>
      {item.netDoseMm !== null && item.grossDoseMm !== null && (
        <Typography variant="metric" component="p" sx={{ m: 0 }}>
          {formatNumber(item.netDoseMm, 0)} / {formatNumber(item.grossDoseMm, 0)}
          <Typography component="span" sx={{ ml: 0.5, fontSize: '1rem' }}>
            mm (netto / brutto)
          </Typography>
        </Typography>
      )}
      {item.doseM3PerHa !== null && (
        <Typography variant="caption">{formatNumber(item.doseM3PerHa, 0)} m³/ha</Typography>
      )}
      {item.window && <Typography variant="caption">Okno: {item.window}</Typography>}
      {item.nextCheckInDays !== null && (
        <Typography variant="caption">Sprawdź ponownie za {item.nextCheckInDays} dni</Typography>
      )}
    </Stack>
  );
}

function RecommendationCard({ item, isPrint }: { item: Recommendation; isPrint: boolean }) {
  const isHigh = item.priority === 'high';
  return (
    <Card
      component="li"
      sx={(theme) => ({
        listStyle: 'none',
        height: '100%',
        ...(isHigh && {
          bgcolor: theme.palette.secondary.main,
          color: theme.palette.secondary.contrastText,
        }),
      })}
    >
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h4" component="h4" sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
            {item.title}
          </Typography>
          <Box>
            <Chip
              variant="outlined"
              size="small"
              icon={<PriorityHighIcon />}
              label={PRIORITY_LABEL[item.priority]}
              sx={{ fontWeight: 600, color: 'inherit', borderColor: 'inherit', minHeight: 32 }}
            />
          </Box>
          {item.irrigation && <IrrigationBlock item={item.irrigation} />}
          <Field label="Co zrobić">{item.action}</Field>
          {item.where && <Field label="Gdzie">{item.where}</Field>}
          {item.when && <Field label="Kiedy">{item.when}</Field>}
          <Accordion
            disableGutters
            variant="outlined"
            expanded={isPrint ? true : undefined}
            defaultExpanded={false}
            sx={{ bgcolor: 'background.paper', color: 'text.primary' }}
          >
            <AccordionSummary
              expandIcon={isPrint ? null : <ExpandMoreIcon />}
              sx={{ minHeight: 44 }}
            >
              <Typography sx={{ fontWeight: 600 }}>Dlaczego?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                <Typography sx={{ maxWidth: '75ch' }}>{item.why}</Typography>
                {item.evidence.length > 0 && (
                  <Box component="ul" sx={{ m: 0, pl: 3 }}>
                    {item.evidence.map((e) => (
                      <Typography key={`${e.label}-${e.dataDate}`} component="li" variant="caption">
                        {formatEvidence(e)}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function RecommendationList({
  recommendations,
  dataGaps,
  isPrint = false,
}: RecommendationListProps) {
  return (
    <Card
      component="section"
      id="co-zrobic"
      aria-labelledby="co-zrobic-title"
      sx={{ scrollMarginTop: 16 }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Typography id="co-zrobic-title" variant="h2" component="h2">
            Co zrobić
          </Typography>
          {recommendations.length === 0 ? (
            <Stack spacing={1}>
              <Typography color="text.secondary">
                Za mało danych, by bezpiecznie doradzić.
              </Typography>
              {dataGaps.length > 0 && (
                <Box component="ul" sx={{ m: 0, pl: 3 }}>
                  {dataGaps.map((gap) => (
                    <Typography key={`${gap.sourceId}-${gap.what}`} component="li">
                      {gap.what} – {gap.impact}
                    </Typography>
                  ))}
                </Box>
              )}
            </Stack>
          ) : (
            GROUPS.map(({ category, title }) => {
              const items = recommendations
                .filter((r) => r.category === category)
                .sort((a, b) => a.order - b.order);
              return (
                <Stack key={category} spacing={1.5}>
                  <Typography variant="h3" component="h3">
                    {title}
                  </Typography>
                  {items.length === 0 ? (
                    <Typography color="text.secondary">
                      Brak rekomendacji: za mało danych.
                    </Typography>
                  ) : (
                    <Box
                      component="ul"
                      sx={{
                        m: 0,
                        p: 0,
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: {
                          xs: 'minmax(0, 1fr)',
                          lg: 'repeat(2, minmax(0, 1fr))',
                        },
                      }}
                    >
                      {items.map((item) => (
                        <RecommendationCard key={item.ruleId} item={item} isPrint={isPrint} />
                      ))}
                    </Box>
                  )}
                </Stack>
              );
            })
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
