// UI-S-003 ReportAccountBadge: shows which household account a report is saved in, or a login hint (hidden in print)
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import { Box, Chip, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import type { Report } from '@/api/types';
import { useSessionStore } from '@/store/session';

export interface ReportAccountBadgeProps {
  report: Report;
}

export function ReportAccountBadge({ report }: ReportAccountBadgeProps) {
  const token = useSessionStore((state) => state.token);
  const accountName = useSessionStore(
    (state) => state.accounts.find((account) => account.id === report.accountId)?.name,
  );

  let content = null;
  if (report.accountId) {
    if (accountName) {
      content = (
        <Chip
          icon={<GroupsOutlinedIcon />}
          label={`Zapisano w: ${accountName}`}
          color="primary"
          variant="outlined"
          sx={{
            height: 'auto',
            minHeight: 32,
            '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
          }}
        />
      );
    }
  } else if (!token) {
    content = (
      <Link
        component={RouterLink}
        to="/logowanie?next=/"
        variant="body2"
        sx={{ display: 'inline-flex', alignItems: 'center', minHeight: 44 }}
      >
        Zaloguj się, aby zapisywać raporty w gospodarstwie
      </Link>
    );
  }

  if (!content) return null;
  return <Box className="no-print">{content}</Box>;
}
