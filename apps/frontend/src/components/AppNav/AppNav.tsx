// T-058 T-085 AppNav: the report "Wstecz" button (header links moved to the Sidebar, UI-C-016)
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Button } from '@mui/material';
import { Link as RouterLink, useMatch } from 'react-router-dom';

import { useReportQuery } from '@/api/analyses';

/** "Wstecz" on the report: back to the parcel step of that report's parcel */
export function ReportBackButton() {
  const match = useMatch('/report/:id');
  const { data } = useReportQuery(match?.params.id);
  if (!match || !data) return null;
  return (
    <Button
      component={RouterLink}
      to={`/parcel/${encodeURIComponent(data.parcel.id)}`}
      variant="outlined"
      color="inherit"
      startIcon={<ArrowBackIcon aria-hidden />}
      className="no-print"
      sx={{ minHeight: 48, mb: 2, borderColor: 'text.secondary' }}
    >
      Wstecz
    </Button>
  );
}
