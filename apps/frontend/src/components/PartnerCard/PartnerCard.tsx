// UI-C-016 API-010 API-012 API-021 PartnerCard: one partner with role tag (T-104), status, access summary, expandable access
// editor and remove confirmation; what the signed-in user may do depends on their role
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { useUpdateMemberRoleMutation } from '@/api/accountParcels';
import { ApiError } from '@/api/client';
import type { Member, MemberRole, ParcelOverview } from '@/api/types';
import {
  ParcelAccessEditor,
  parcelLabel,
} from '@/components/ParcelAccessEditor/ParcelAccessEditor';

function plural(count: number): string {
  if (count === 1) return 'działka';
  const last = count % 10;
  const tens = count % 100;
  return last >= 2 && last <= 4 && (tens < 12 || tens > 14) ? 'działki' : 'działek';
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Właściciel',
  partner: 'Wspólnik',
  member: 'Członek',
  guest: 'Gość',
};

const ROLE_HINTS: Record<MemberRole, string> = {
  owner: 'pełne prawa',
  partner: 'zmienia działki i pola, usuwa członków i gości',
  member: 'tylko ogląda',
  guest: 'tylko ogląda',
};

const ROLE_ORDER: MemberRole[] = ['owner', 'partner', 'member', 'guest'];

export function roleOf(member: Member): MemberRole {
  return member.isCreator ? 'owner' : (member.role ?? 'partner');
}

// T-104 owner removes anyone but the creator, partner only member and guest
export function canRemove(myRole: MemberRole, member: Member): boolean {
  if (member.isCreator) return false;
  const target = roleOf(member);
  return (
    myRole === 'owner' || (myRole === 'partner' && (target === 'member' || target === 'guest'))
  );
}

// Parcels this member sees; null = every parcel of the account
export function accessibleParcels(member: Member, parcels: ParcelOverview[]): ParcelOverview[] {
  const ids = member.parcelIds ?? null;
  return ids === null ? parcels : parcels.filter((item) => ids.includes(item.parcel.id));
}

export function accessSummary(member: Member, parcels: ParcelOverview[]): string {
  if ((member.parcelIds ?? null) === null) return 'Wszystkie działki';
  const list = accessibleParcels(member, parcels);
  if (list.length === 0) return 'Brak działek';
  const shown = list.slice(0, 3).map((item) => item.parcel.parcelNumber);
  return `${list.length} ${plural(list.length)}: ${shown.join(', ')}${list.length > 3 ? ', …' : ''}`;
}

export interface PartnerCardProps {
  accountId: string;
  token: string;
  member: Member;
  parcels: ParcelOverview[];
  isLastActive: boolean;
  // The signed-in user: API-021 refuses to change own access (CANNOT_RESTRICT_SELF), so no editor or remove
  isSelf: boolean;
  isRemoving: boolean;
  onRemove: (memberId: string) => void;
  // T-104 role of the signed-in user in this account
  myRole: MemberRole;
}

export function PartnerCard({
  accountId,
  token,
  member,
  parcels,
  isLastActive,
  isSelf,
  isRemoving,
  onRemove,
  myRole,
}: PartnerCardProps) {
  const role = roleOf(member);
  const setRole = useUpdateMemberRoleMutation(accountId, token);
  const isOwner = myRole === 'owner';
  // the owner manages tags and access of everyone except themselves and the creator
  const manages = isOwner && !isSelf && !member.isCreator;
  const removable = !isSelf && canRemove(myRole, member);
  const roleError =
    setRole.error instanceof ApiError
      ? setRole.error.message
      : setRole.error
        ? 'Nie udało się zmienić tagu. Spróbuj ponownie.'
        : null;
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const panelId = `partner-panel-${member.id}`;
  const own = accessibleParcels(member, parcels);
  const blocked = isLastActive && member.status === 'active';

  return (
    <Card sx={{ p: 0 }}>
      <Button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        sx={{
          width: '100%',
          justifyContent: 'space-between',
          textAlign: 'left',
          textTransform: 'none',
          color: 'text.primary',
          minHeight: 64,
          p: 2,
          gap: 1,
        }}
        endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography component="span" sx={{ display: 'block', fontWeight: 700 }}>
            {member.name ?? member.email}
            {isSelf && ' (to Ty)'}
          </Typography>
          {member.name && (
            <Typography
              component="span"
              color="text.secondary"
              sx={{ display: 'block', overflowWrap: 'anywhere' }}
            >
              {member.email}
            </Typography>
          )}
          <Typography component="span" sx={{ display: 'block' }}>
            {accessSummary(member, parcels)}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}>
            <Chip
              size="small"
              sx={{ fontSize: '1rem', fontWeight: 700 }}
              label={ROLE_LABELS[role]}
              color={role === 'owner' ? 'primary' : role === 'partner' ? 'secondary' : 'default'}
            />
            <Chip
              size="small"
              sx={{ fontSize: '1rem' }}
              label={member.status === 'pending' ? 'czeka na rejestrację' : 'aktywny'}
              color={member.status === 'pending' ? 'warning' : 'default'}
              variant="outlined"
            />
          </Stack>
        </Box>
        <Box component="span" sx={{ fontWeight: 700 }}>
          {open ? 'Zwiń' : 'Pokaż'}
        </Box>
      </Button>
      {open && (
        <Stack id={panelId} spacing={2} sx={{ p: 2, pt: 0 }}>
          <Box>
            <Typography component="h2" variant="h3" sx={{ mb: 0.5 }}>
              {isSelf ? 'Twoje działki' : 'Działki tej osoby'}
            </Typography>
            {own.length === 0 ? (
              <Typography>Ta osoba nie widzi żadnej działki.</Typography>
            ) : (
              <Box component="ul" sx={{ m: 0, pl: 3 }}>
                {own.map((item) => (
                  <li key={item.parcel.id}>
                    <Typography>{parcelLabel(item)}</Typography>
                  </li>
                ))}
              </Box>
            )}
          </Box>
          {manages && (
            <Box>
              <TextField
                select
                label="Tag tej osoby"
                value={role}
                disabled={setRole.isPending}
                onChange={(event) =>
                  setRole.mutate({ memberId: member.id, role: event.target.value as MemberRole })
                }
                helperText={ROLE_HINTS[role]}
                sx={{ minWidth: 240 }}
              >
                {ROLE_ORDER.map((value) => (
                  <MenuItem key={value} value={value} sx={{ minHeight: 48 }}>
                    {ROLE_LABELS[value]} – {ROLE_HINTS[value]}
                  </MenuItem>
                ))}
              </TextField>
              {roleError && (
                <Alert severity="error" role="alert" sx={{ mt: 1 }}>
                  {roleError}
                </Alert>
              )}
            </Box>
          )}
          {!manages ? (
            <Typography color="text.secondary">
              {member.isCreator
                ? 'Twórca gospodarstwa: zawsze właściciel, widzi wszystkie działki i nie można go usunąć.'
                : isSelf
                  ? `Twój tag: ${ROLE_LABELS[role]} (${ROLE_HINTS[role]}). Zmienia go właściciel.`
                  : 'Tag i dostęp do działek zmienia właściciel.'}
            </Typography>
          ) : (
            <ParcelAccessEditor
              // keyed by member only: a parcelIds key remounted the editor after save and hid „Zapisano”
              key={member.id}
              accountId={accountId}
              token={token}
              member={member}
              parcels={parcels}
            />
          )}
          {!removable ? null : confirming ? (
            <Box
              role="group"
              aria-label={`Potwierdź usunięcie: ${member.email}`}
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'kropla.severeBg',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Typography sx={{ flex: '1 1 200px' }}>Usunąć tę osobę z gospodarstwa?</Typography>
              <Button
                variant="contained"
                color="error"
                disabled={isRemoving}
                onClick={() => {
                  onRemove(member.id);
                  setConfirming(false);
                }}
                sx={{
                  minHeight: 48,
                  background: 'none',
                  bgcolor: 'error.main',
                  color: 'error.contrastText',
                }}
              >
                Tak, usuń
              </Button>
              <Button
                variant="outlined"
                onClick={() => setConfirming(false)}
                sx={{ minHeight: 48 }}
              >
                Nie
              </Button>
            </Box>
          ) : (
            <Box>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                disabled={blocked || isRemoving}
                onClick={() => setConfirming(true)}
                sx={{ minHeight: 48 }}
              >
                Usuń wspólnika
              </Button>
              {blocked && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Nie można usunąć jedynej osoby w gospodarstwie.
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      )}
    </Card>
  );
}
