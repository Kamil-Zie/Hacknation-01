// UI-S-006 Household account page: active account name (rename via API-014), members and report history
import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import {
  useAddMemberMutation,
  useMembersQuery,
  useRemoveMemberMutation,
  useRenameAccountMutation,
} from '@/api/accounts';
import { ApiError } from '@/api/client';
import { AccountReportHistory } from '@/components/AccountReportHistory/AccountReportHistory';
import { MemberList } from '@/components/MemberList/MemberList';
import { useSessionStore } from '@/store/session';
import { errorMessage } from '@/utils/errorMessages';

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
  const rename = useRenameAccountMutation(accountId, token ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const renameError = rename.error ? errorMessage(rename.error) : null;

  if (!token) {
    return <Navigate to={`/logowanie?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const active = accounts.find((account) => account.id === activeAccountId);

  return (
    <Stack spacing={3} sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box>
        <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700 }}>
          Panel gospodarstwa
        </Typography>
        {isEditing && active ? (
          <Stack
            component="form"
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              rename.mutate(draft, { onSuccess: () => setIsEditing(false) });
            }}
            sx={{ alignItems: { sm: 'flex-start' } }}
          >
            <TextField
              label="Nazwa gospodarstwa"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              autoFocus
              disabled={rename.isPending}
              error={Boolean(rename.error)}
              helperText={renameError?.message}
              slotProps={{
                htmlInput: { maxLength: 120 },
                formHelperText: { role: renameError ? 'alert' : undefined },
              }}
              sx={{ flexGrow: 1, maxWidth: 480 }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={rename.isPending || !draft.trim()}
              sx={{ minHeight: 48 }}
            >
              {rename.isPending ? 'Zapisuję…' : 'Zapisz'}
            </Button>
            <Button
              variant="text"
              disabled={rename.isPending}
              onClick={() => setIsEditing(false)}
              sx={{ minHeight: 48 }}
            >
              Anuluj
            </Button>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h1" component="h1" sx={{ overflowWrap: 'anywhere' }}>
              {active?.name ?? 'Gospodarstwo'}
            </Typography>
            {active && (
              <Button
                variant="outlined"
                onClick={() => {
                  rename.reset();
                  setDraft(active.name);
                  setIsEditing(true);
                }}
                sx={{ minHeight: 48 }}
              >
                Zmień nazwę
              </Button>
            )}
          </Stack>
        )}
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
