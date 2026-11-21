// UI-S-006 Moje gospodarstwo: members of the active household account and its report history
import { Box, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Navigate, useLocation } from 'react-router-dom';

import { useAddMemberMutation, useMembersQuery, useRemoveMemberMutation } from '@/api/accounts';
import { ApiError } from '@/api/client';
import { AccountReportHistory } from '@/components/AccountReportHistory/AccountReportHistory';
import { MemberList } from '@/components/MemberList/MemberList';
import { useSessionStore } from '@/store/session';

function toError(error: unknown): { code: string; message: string } | null {
  if (!error) return null;
  if (error instanceof ApiError) return { code: error.code, message: error.message };
  return { code: 'NETWORK_ERROR', message: 'Nie udało się połączyć. Spróbuj ponownie.' };
}

export function AccountPage() {
  const location = useLocation();
  const { token, accounts, activeAccountId, setActiveAccount } = useSessionStore();
  const accountId = activeAccountId ?? '';
  const members = useMembersQuery(activeAccountId, token);
  const add = useAddMemberMutation(accountId, token ?? '');
  const remove = useRemoveMemberMutation(accountId, token ?? '');

  if (!token) {
    return <Navigate to={`/logowanie?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const active = accounts.find((account) => account.id === activeAccountId);

  return (
    <Stack spacing={3} sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box>
        <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700 }}>
          Moje gospodarstwo
        </Typography>
        <Typography variant="h1" component="h1" sx={{ overflowWrap: 'anywhere' }}>
          {active?.name ?? 'Gospodarstwo'}
        </Typography>
        {accounts.length > 1 && (
          <TextField
            select
            label="Aktywne gospodarstwo"
            value={activeAccountId ?? ''}
            onChange={(event) => setActiveAccount(event.target.value)}
            sx={{ mt: 2, minWidth: 260 }}
          >
            {accounts.map((account) => (
              <MenuItem key={account.id} value={account.id} sx={{ minHeight: 44 }}>
                {account.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '400px minmax(0, 1fr)' },
          alignItems: 'start',
        }}
      >
        <Card component="section" aria-labelledby="czlonkowie-title">
          <CardContent>
            <Stack spacing={2}>
              <Typography id="czlonkowie-title" variant="h2" component="h2">
                Członkowie
              </Typography>
              <MemberList
                members={members.data ?? []}
                isLoading={members.isPending}
                error={toError(members.error)}
                isAdding={add.isPending}
                addError={toError(add.error)}
                removingId={remove.isPending ? (remove.variables ?? null) : null}
                removeError={toError(remove.error)}
                onAdd={(email) => add.mutate(email)}
                onRemove={(memberId) => remove.mutate(memberId)}
                onRetry={() => void members.refetch()}
              />
            </Stack>
          </CardContent>
        </Card>
        <Box sx={{ minWidth: 0 }}>
          <AccountReportHistory />
        </Box>
      </Box>
    </Stack>
  );
}
