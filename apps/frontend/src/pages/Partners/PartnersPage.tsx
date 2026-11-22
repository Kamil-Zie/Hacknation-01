// UI-S-012 API-010 API-011 API-012 API-020 API-021 Partners and per-parcel access: filter by parcel, search person, edit access [T-090]
// T-104 role tags: owner sets tags, owner and partner invite, member and guest only view
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { useAccountParcelsQuery } from '@/api/accountParcels';
import { useAddMemberMutation, useMembersQuery, useRemoveMemberMutation } from '@/api/accounts';
import { ApiError } from '@/api/client';
import { PartnerAddForm } from '@/components/PartnerAddForm/PartnerAddForm';
import { PartnerCard, ROLE_LABELS, roleOf } from '@/components/PartnerCard/PartnerCard';
import { useSessionStore } from '@/store/session';

function toError(error: unknown): { code: string; message: string } | null {
  if (!error) return null;
  if (error instanceof ApiError) return { code: error.code, message: error.message };
  return { code: 'NETWORK_ERROR', message: 'Nie udało się połączyć. Spróbuj ponownie.' };
}

export function PartnersPage() {
  const { token, activeAccountId, user } = useSessionStore();
  const accountId = activeAccountId ?? '';
  const members = useMembersQuery(activeAccountId, token);
  const parcels = useAccountParcelsQuery(activeAccountId, token);
  const add = useAddMemberMutation(accountId, token ?? '');
  const remove = useRemoveMemberMutation(accountId, token ?? '');
  const [parcelId, setParcelId] = useState('');
  const [query, setQuery] = useState('');

  const parcelList = parcels.data ?? [];
  const all = members.data ?? [];
  const needle = query.trim().toLowerCase();
  const visible = all.filter((member) => {
    const hasParcel =
      !parcelId || (member.parcelIds ?? null) === null || member.parcelIds?.includes(parcelId);
    const matches =
      !needle ||
      (member.name ?? '').toLowerCase().includes(needle) ||
      member.email.toLowerCase().includes(needle);
    return hasParcel && matches;
  });
  const activeCount = all.filter((member) => member.status === 'active').length;
  const me = all.find(
    (member) => user !== null && member.email.toLowerCase() === user.email.toLowerCase(),
  );
  const myRole = me ? roleOf(me) : 'guest';
  const canInvite = myRole === 'owner' || myRole === 'partner';
  const loadError = toError(members.error) ?? toError(parcels.error);
  const isLoading = members.isPending || parcels.isPending;

  let list;
  if (isLoading && !loadError) {
    list = (
      <Stack spacing={1} role="status" aria-label="Ładowanie wspólników">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} variant="rounded" height={110} />
        ))}
      </Stack>
    );
  } else if (loadError) {
    list = (
      <Alert
        severity="error"
        role="alert"
        action={
          <Button
            color="inherit"
            sx={{ minHeight: 48 }}
            onClick={() => {
              void members.refetch();
              void parcels.refetch();
            }}
          >
            Spróbuj ponownie
          </Button>
        }
      >
        {loadError.message}
      </Alert>
    );
  } else if (all.length === 0) {
    list = <Typography>Nie masz jeszcze wspólników. Dodaj pierwszą osobę poniżej.</Typography>;
  } else if (visible.length === 0) {
    list = <Typography role="status">Nikt nie pasuje do wybranych filtrów.</Typography>;
  } else {
    list = (
      <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {visible.map((member) => (
          <li key={member.id}>
            <PartnerCard
              accountId={accountId}
              token={token ?? ''}
              member={member}
              parcels={parcelList}
              isLastActive={activeCount <= 1}
              isSelf={user !== null && member.email.toLowerCase() === user.email.toLowerCase()}
              isRemoving={remove.isPending}
              onRemove={(memberId) => remove.mutate(memberId)}
              myRole={myRole}
            />
          </li>
        ))}
      </Stack>
    );
  }

  const removeError = toError(remove.error);

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 1600 }}>
      <Typography variant="h1" component="h1">
        Wspólnicy
      </Typography>
      {me && (
        <Typography>
          Twój tag: <strong>{ROLE_LABELS[myRole]}</strong>.{' '}
          {myRole === 'owner'
            ? 'Masz pełne prawa i przydzielasz tagi: Właściciel, Wspólnik, Członek, Gość.'
            : myRole === 'partner'
              ? 'Możesz zmieniać działki i pola, zapraszać osoby i usuwać członków oraz gości.'
              : 'Możesz oglądać szczegóły działek. Zmiany wprowadza właściciel albo wspólnik.'}
        </Typography>
      )}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        }}
      >
        <TextField
          select
          label="Działka"
          value={parcelId}
          onChange={(event) => setParcelId(event.target.value)}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        >
          <MenuItem value="" sx={{ minHeight: 48 }}>
            Wszystkie działki
          </MenuItem>
          {parcelList.map((item) => (
            <MenuItem key={item.parcel.id} value={item.parcel.id} sx={{ minHeight: 48 }}>
              {item.parcel.parcelNumber}, {item.parcel.commune}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Szukaj osoby"
          type="search"
          placeholder="Imię lub e-mail"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon aria-hidden />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' },
          alignItems: 'start',
        }}
      >
        <Stack spacing={1.5} aria-live="polite">
          {list}
          {removeError && (
            <Alert severity="error" role="alert">
              {removeError.code === 'LAST_MEMBER'
                ? 'To ostatnia osoba w gospodarstwie – nie można jej usunąć.'
                : removeError.message}
            </Alert>
          )}
        </Stack>
        {canInvite && (
          <PartnerAddForm
            isAdding={add.isPending}
            addError={toError(add.error)}
            onAdd={(email) => add.mutate(email)}
          />
        )}
      </Box>
    </Stack>
  );
}
