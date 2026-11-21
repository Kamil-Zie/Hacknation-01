// UI-C-016 API-010 API-012 PartnerCard: one partner with status, access summary, expandable access editor and remove confirmation
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Button, Card, Chip, Stack, Typography } from '@mui/material';
import { useState } from 'react';

import type { Member, ParcelOverview } from '@/api/types';
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
  isRemoving: boolean;
  onRemove: (memberId: string) => void;
}

export function PartnerCard({
  accountId,
  token,
  member,
  parcels,
  isLastActive,
  isRemoving,
  onRemove,
}: PartnerCardProps) {
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
          <Chip
            size="small"
            sx={{ mt: 0.5, fontSize: '1rem' }}
            label={member.status === 'pending' ? 'czeka na rejestrację' : 'aktywny'}
            color={member.status === 'pending' ? 'warning' : 'default'}
            variant="outlined"
          />
        </Box>
        <Box component="span" sx={{ fontWeight: 700 }}>
          {open ? 'Zwiń' : 'Pokaż'}
        </Box>
      </Button>
      {open && (
        <Stack id={panelId} spacing={2} sx={{ p: 2, pt: 0 }}>
          <Box>
            <Typography component="h3" variant="h3" sx={{ mb: 0.5 }}>
              Działki tej osoby
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
          <ParcelAccessEditor
            key={`${member.id}:${JSON.stringify(member.parcelIds ?? null)}`}
            accountId={accountId}
            token={token}
            member={member}
            parcels={parcels}
          />
          {confirming ? (
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
