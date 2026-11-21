// UI-C-008 RecommendationList: "Co zrobić później?" - recommendation cards grouped by category
import { Box, Typography } from '@mui/material';

import type { DataGap, Recommendation, RecommendationCategory, Severity } from '@/api/types';
import { CardGrid } from '@/components/CardGrid/CardGrid';
import { MetricCard } from '@/components/MetricCard/MetricCard';
import { SectionCard } from '@/components/SectionCard/SectionCard';
import { formatNumber } from '@/utils/format';
import { formatEvidence } from '@/utils/sourceLabels';

interface RecommendationListProps {
  recommendations: Recommendation[];
  dataGaps: DataGap[];
}

const GROUPS: { category: RecommendationCategory; title: string }[] = [
  { category: 'retention_landscape', title: 'Retencja w krajobrazie' },
  { category: 'retention_soil', title: 'Retencja w glebie' },
  { category: 'agrotechnics', title: 'Agrotechnika' },
  { category: 'irrigation', title: 'Nawadnianie' },
];

const PRIORITY_LABEL: Record<Severity, string> = {
  high: 'Bardzo ważne',
  medium: 'Średnio ważne',
  low: 'Mało ważne',
};

function Field({ label, children }: { label: string; children: string }) {
  return (
    <Box>
      <Typography component="p" sx={{ m: 0, fontSize: '1rem', fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography sx={{ m: 0, maxWidth: '75ch', fontSize: '1.125rem', lineHeight: 1.45 }}>
        {children}
      </Typography>
    </Box>
  );
}

function IrrigationBlock({ item }: { item: NonNullable<Recommendation['irrigation']> }) {
  if (!item.isJustified) {
    return <Typography sx={{ fontWeight: 600 }}>Nawadnianie teraz nie jest potrzebne</Typography>;
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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
    </Box>
  );
}

function RecommendationCard({ item }: { item: Recommendation }) {
  return (
    <MetricCard
      title={item.title}
      note={item.where ?? undefined}
      alert={{ level: item.priority, label: PRIORITY_LABEL[item.priority] }}
      isAlertAboveButton
    >
      {item.irrigation && <IrrigationBlock item={item.irrigation} />}
      <Field label="Co zrobić">{item.action}</Field>
      {item.when && <Field label="Kiedy">{item.when}</Field>}
      <Field label="Dlaczego?">{item.why}</Field>
      {item.evidence.length > 0 && (
        <Box component="ul" sx={{ m: 0, pl: 3 }}>
          {item.evidence.map((e, index) => (
            <Typography key={`${e.label}-${e.dataDate}-${index}`} component="li" variant="caption">
              {formatEvidence(e)}
            </Typography>
          ))}
        </Box>
      )}
    </MetricCard>
  );
}

export function RecommendationList({ recommendations, dataGaps }: RecommendationListProps) {
  return (
    <SectionCard
      id="co-zrobic"
      title="Co zrobić później?"
      subtitle={
        recommendations.length > 0 ? `Porady dla tej działki: ${recommendations.length}` : undefined
      }
    >
      {recommendations.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography color="text.secondary">Za mało danych, by bezpiecznie doradzić.</Typography>
          {dataGaps.length > 0 && (
            <Box component="ul" sx={{ m: 0, pl: 3 }}>
              {dataGaps.map((gap, index) => (
                <Typography key={`${gap.sourceId}-${gap.what}-${index}`} component="li">
                  {gap.what} – {gap.impact}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      ) : (
        GROUPS.map(({ category, title }) => {
          const items = recommendations
            .filter((r) => r.category === category)
            .sort((a, b) => a.order - b.order);
          return (
            <Box key={category} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography component="h4" sx={{ fontSize: '1.375rem', fontWeight: 800 }}>
                {title}
              </Typography>
              {items.length === 0 ? (
                <Typography color="text.secondary">Brak rekomendacji: za mało danych.</Typography>
              ) : (
                <CardGrid>
                  {items.map((item) => (
                    <RecommendationCard key={item.ruleId} item={item} />
                  ))}
                </CardGrid>
              )}
            </Box>
          );
        })
      )}
    </SectionCard>
  );
}
