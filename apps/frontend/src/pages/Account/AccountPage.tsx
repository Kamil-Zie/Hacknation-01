// UI-S-006 T-081 Panel: CTA, Moje działki, miejsce na Moje pola (T-079), household account page: active account name (rename via API-014), members and report history
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
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useAccountReportsQuery,
  useAddMemberMutation,
  useMembersQuery,
  useRemoveMemberMutation,
  useRenameAccountMutation,
} from '@/api/accounts';
import { ApiError } from '@/api/client';
import { AccountReportHistory } from '@/components/AccountReportHistory/AccountReportHistory';
import { MemberList } from '@/components/MemberList/MemberList';
import { RecentParcels } from '@/components/RecentParcels/RecentParcels';
import { SectionCard } from '@/components/SectionCard/SectionCard';
import { useRecentParcelsStore } from '@/store/recentParcels';
import { useSessionStore } from '@/store/session';
import { errorMessage } from '@/utils/errorMessages';

function toError(error: unknown): { code: string; message: string } | null {
  if (!error) return null;
  if (error instanceof ApiError) return { code: error.code, message: error.message };
  return { code: 'NETWORK_ERROR', message: 'Nie udało się połączyć. Spróbuj ponownie.' };
}

export function AccountPage() {
  const navigate = useNavigate();
  const recent = useRecentParcelsStore((state) => state.items);
  const { token, accounts, activeAccountId, setActiveAccount } = useSessionStore();
  const accountId = activeAccountId ?? '';
  const members = useMembersQuery(activeAccountId, token);
  const add = useAddMemberMutation(accountId, token ?? '');
  const remove = useRemoveMemberMutation(accountId, token ?? '');
  const rename = useRenameAccountMutation(accountId, token ?? '');
  const reports = useAccountReportsQuery(activeAccountId, token);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const renameError = rename.error ? errorMessage(rename.error) : null;

  // recent picks first, then parcels from saved reports (no duplicates)
  const parcels = [...recent];
  for (const report of reports.data ?? []) {
    const { id, parcelNumber, region, commune } = report.parcel;
    if (!parcels.some((item) => item.id === id)) {
      parcels.push({ id, label: `${parcelNumber}, ${region} (${commune})` });
    }
  }
  const myParcels = parcels.slice(0, 8);

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
      <Button
        variant="contained"
        size="large"
        startIcon={<AddLocationAltIcon />}
        onClick={() => navigate('/')}
        sx={{ minHeight: 64, fontSize: '1.25rem', alignSelf: { sm: 'flex-start' }, px: 4 }}
      >
        Sprawdź nową działkę
      </Button>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' },
          alignItems: 'start',
        }}
      >
        <SectionCard id="moje-dzialki" title="Moje działki">
          {myParcels.length === 0 ? (
            <Typography>Nie sprawdzano jeszcze żadnej działki.</Typography>
          ) : (
            <RecentParcels
              items={myParcels}
              currentId={null}
              onSelect={(id) => navigate(`/parcel/${encodeURIComponent(id)}`)}
            />
          )}
        </SectionCard>
        {/* T-079 slot: Dawid drops the "Moje pola" component here */}
        <SectionCard id="moje-pola" title="Moje pola">
          <Typography>Wkrótce: łącz sąsiednie działki w pole.</Typography>
        </SectionCard>
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
