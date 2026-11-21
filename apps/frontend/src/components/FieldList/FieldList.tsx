// UI-S-006 UI-S-011 API-017 API-018 FieldList: "Moje pola" section of the account page (list, report link, delete with confirmation)
import AddIcon from '@mui/icons-material/Add';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useDeleteFieldMutation, useFieldsQuery } from '@/api/fields';
import type { Field } from '@/api/types';
import { useSessionStore } from '@/store/session';
import { errorMessage } from '@/utils/errorMessages';

const BIG_BUTTON = { minHeight: 48, fontSize: 18 } as const;

function formatHa(value: number): string {
  return `${value.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} ha`;
}

interface FieldListProps {
  /** true on /pola: the page has its own h1 and create button */
  hideHeader?: boolean;
}

export function FieldList({ hideHeader = false }: FieldListProps) {
  const token = useSessionStore((state) => state.token);
  const accountId = useSessionStore((state) => state.activeAccountId);
  const query = useFieldsQuery(accountId, token);
  const remove = useDeleteFieldMutation(accountId ?? '', token ?? '');
  const [toDelete, setToDelete] = useState<Field | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const toggle = (id: string) =>
    setExpandedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  if (!token || !accountId) return null;

  let body;
  if (query.isPending) {
    body = (
      <Stack spacing={1} aria-label="Ładowanie pól">
        {[0, 1].map((key) => (
          <Skeleton key={key} variant="rounded" height={104} />
        ))}
      </Stack>
    );
  } else if (query.isError) {
    body = (
      <Alert
        severity="error"
        role="alert"
        sx={{ fontSize: 18 }}
        action={
          <Button color="inherit" sx={BIG_BUTTON} onClick={() => void query.refetch()}>
            Spróbuj ponownie
          </Button>
        }
      >
        Nie udało się pobrać listy pól.
      </Alert>
    );
  } else if (query.data.length === 0) {
    body = (
      <Typography color="text.secondary" sx={{ fontSize: 18 }}>
        Nie masz jeszcze pól. Pole to kilka działek obok siebie – np. jedna uprawa na kilku
        działkach.
      </Typography>
    );
  } else {
    body = (
      <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {query.data.map((field) => (
          <li key={field.id}>
            <Card variant="outlined">
              <CardContent
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { md: 'center' },
                  gap: 2,
                  '&:last-child': { pb: 2 },
                }}
              >
                <Button
                  color="inherit"
                  onClick={() => toggle(field.id)}
                  aria-expanded={expandedIds.includes(field.id)}
                  aria-controls={`field-parcels-${field.id}`}
                  endIcon={
                    <ExpandMoreIcon
                      aria-hidden
                      sx={{
                        transform: expandedIds.includes(field.id) ? 'rotate(180deg)' : 'none',
                        transition: 'transform 150ms',
                      }}
                    />
                  }
                  sx={{
                    ...BIG_BUTTON,
                    minHeight: 56,
                    minWidth: 0,
                    flex: 1,
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    textTransform: 'none',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      component="span"
                      sx={{ display: 'block', fontSize: 20, fontWeight: 600 }}
                    >
                      {field.name}
                    </Typography>
                    <Typography
                      component="span"
                      color="text.secondary"
                      sx={{ display: 'block', fontSize: 18 }}
                    >
                      Działek: {field.parcelIds.length} · {formatHa(field.areaHa)}
                    </Typography>
                  </Box>
                </Button>
                <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <Button
                    component={RouterLink}
                    to={`/pole/${encodeURIComponent(field.id)}/raport`}
                    variant="contained"
                    startIcon={<AssessmentOutlinedIcon aria-hidden />}
                    sx={BIG_BUTTON}
                  >
                    Raport pola
                  </Button>
                  <Button
                    color="inherit"
                    variant="outlined"
                    startIcon={<DeleteOutlineIcon aria-hidden />}
                    onClick={() => {
                      remove.reset();
                      setToDelete(field);
                    }}
                    sx={BIG_BUTTON}
                  >
                    Usuń
                  </Button>
                </Stack>
              </CardContent>
              <Collapse in={expandedIds.includes(field.id)} unmountOnExit>
                <Box
                  id={`field-parcels-${field.id}`}
                  role="region"
                  aria-label={`Działki pola ${field.name}`}
                  sx={{ px: 2, pb: 2 }}
                >
                  <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
                    {field.parcels.map((parcel) => (
                      <Box
                        component="li"
                        key={parcel.id}
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', md: 'row' },
                          justifyContent: 'space-between',
                          alignItems: { md: 'center' },
                          gap: 1,
                          p: 1.5,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography component="p" sx={{ fontSize: 18, fontWeight: 600 }}>
                            Działka {parcel.parcelNumber}
                          </Typography>
                          <Typography color="text.secondary" sx={{ fontSize: 18 }}>
                            Obręb {parcel.region} · gmina {parcel.commune} ·{' '}
                            {formatHa(parcel.areaHa)}
                          </Typography>
                        </Box>
                        <Button
                          component={RouterLink}
                          to={`/parcel/${encodeURIComponent(parcel.id)}`}
                          variant="outlined"
                          startIcon={<SearchIcon aria-hidden />}
                          sx={BIG_BUTTON}
                        >
                          Sprawdź tę działkę
                        </Button>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Collapse>
            </Card>
          </li>
        ))}
      </Stack>
    );
  }

  return (
    <Box
      component="section"
      aria-labelledby={hideHeader ? undefined : 'account-fields-heading'}
      aria-label={hideHeader ? 'Lista pól' : undefined}
    >
      {!hideHeader && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ sm: 'center' }}
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Typography id="account-fields-heading" variant="h2">
            Moje pola
          </Typography>
          <Button
            component={RouterLink}
            to="/pole/nowe"
            variant="contained"
            startIcon={<AddIcon aria-hidden />}
            sx={BIG_BUTTON}
          >
            Utwórz pole
          </Button>
        </Stack>
      )}
      {body}
      <Dialog open={toDelete !== null} onClose={() => setToDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>Usunąć pole?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 18 }}>
            Pole „{toDelete?.name}” zniknie z listy. Działki i zapisane raporty zostają.
          </DialogContentText>
          {remove.isError && (
            <Alert severity="error" role="alert" sx={{ mt: 2, fontSize: 18 }}>
              {errorMessage(remove.error).message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
          <Button sx={BIG_BUTTON} onClick={() => setToDelete(null)}>
            Anuluj
          </Button>
          <Button
            variant="contained"
            color="error"
            sx={BIG_BUTTON}
            disabled={remove.isPending}
            onClick={() => {
              if (!toDelete) return;
              remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
            }}
          >
            Usuń pole
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
