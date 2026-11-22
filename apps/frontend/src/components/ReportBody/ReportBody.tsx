// UI-S-003 ReportBody: report content below the header, shared by the report page and the print view
import { Box, Typography } from '@mui/material';

import type { Report } from '@/api/types';
import { AssessmentSection } from '@/components/AssessmentSection/AssessmentSection';
import { RecommendationList } from '@/components/RecommendationList/RecommendationList';
import { ReportOverview } from '@/components/ReportOverview/ReportOverview';
import { SourcesLimitations } from '@/components/SourcesLimitations/SourcesLimitations';
import { VulnerabilityCauses } from '@/components/VulnerabilityCauses/VulnerabilityCauses';
import { formatDateTime } from '@/utils/format';

interface ReportBodyProps {
  report: Report;
}

export function ReportBody({ report }: ReportBodyProps) {
  return (
    <>
      <ReportOverview report={report} />
      <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h2" component="h2" sx={{ fontSize: '1.75rem', fontWeight: 800 }}>
          Więcej informacji
        </Typography>
        {/* T-103 order: most useful first, more detail further down –
            what to do → why (vulnerability, causes) → detailed water figures → sources */}
        <RecommendationList recommendations={report.recommendations} dataGaps={report.dataGaps} />
        <VulnerabilityCauses vulnerability={report.vulnerability} causes={report.causes} />
        <AssessmentSection
          assessment={report.assessment}
          cropName={report.crop.name}
          analysisDate={report.analysisDate}
          dataGaps={report.dataGaps}
          charts={report.charts ?? null}
        />
        <SourcesLimitations
          sources={report.sources}
          limitations={report.limitations}
          dataGaps={report.dataGaps}
          confidenceReasons={report.assessment.confidenceReasons}
          methodologyVersion={report.methodologyVersion}
        />
        <Typography color="text.secondary" sx={{ fontSize: '1rem', mt: 0.5 }}>
          Raport przygotowany {formatDateTime(report.computedAt)}
        </Typography>
      </Box>
    </>
  );
}
