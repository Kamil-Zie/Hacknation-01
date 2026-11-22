// UI-S-007 API-016 Create a field: name + 2-20 parcels added with the same search as „Dodaj działkę” (number / address / GPS / map)
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useCreateFieldMutation } from '@/api/fields';
import { getParcelById, getParcelByPoint } from '@/api/parcels';
import type { Parcel } from '@/api/types';
import { ParcelMap } from '@/components/ParcelMap/ParcelMap';
import { ParcelSearch } from '@/components/ParcelSearch/ParcelSearch';
import { useRecentParcelsStore } from '@/store/recentParcels';
import { useSessionStore } from '@/store/session';
import { errorMessage } from '@/utils/errorMessages';

const MAX_PARCELS = 20;
const MAX_NAME = 120;
const BIG_TEXT = { fontSize: 18 } as const;
const BIG_BUTTON = { minHeight: 48, fontSize: 18 } as const;

function formatHa(value: number): string {
  return `${value.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} ha`;
}

export function FieldCreatePage() {
  const navigate = useNavigate();
  const token = useSessionStore((state) => state.token);
  const accountId = useSessionStore((state) => state.activeAccountId);
  const recent = useRecentParcelsStore((state) => state.items);
  const create = useCreateFieldMutation(accountId ?? '', token ?? '');
  const [name, setName] = useState('');
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [focus, setFocus] = useState<{
    lat: number;
    lon: number;
    bounds?: [[number, number], [number, number]];
  } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  if (!token || !accountId) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto' }}>
        <Typography variant="h1">Dodaj grupę działek</Typography>
        <Alert severity="info" sx={BIG_TEXT}>
          Aby dodać grupę działek, zaloguj się.
        </Alert>
        <Button
          component={RouterLink}
          to="/logowanie?next=%2Fpole%2Fnowe"
          variant="contained"
          sx={BIG_BUTTON}
        >
          Zaloguj się
        </Button>
      </Stack>
    );
  }

  const trimmedName = name.trim();
  const canSave = parcels.length >= 2 && trimmedName.length > 0 && !create.isPending;
  const totalHa = parcels.reduce((sum, parcel) => sum + parcel.areaHa, 0);
  const submitError = create.error ? errorMessage(create.error).message : null;

  function resetErrors() {
    setAddError(null);
    create.reset();
  }

  function addParcel(parcel: Parcel) {
    resetErrors();
    if (parcels.some((item) => item.id === parcel.id)) {
      setAddError(`Działka ${parcel.parcelNumber} jest już na liście.`);
    } else if (parcels.length >= MAX_PARCELS) {
      setAddError('Grupa działek może mieć najwyżej 20 działek.');
    } else {
      setParcels((current) => [...current, parcel]);
    }
  }

  async function load(fetcher: () => Promise<Parcel>) {
    setIsAdding(true);
    try {
      addParcel(await fetcher());
    } catch (error) {
      setAddError(errorMessage(error).message);
    } finally {
      setIsAdding(false);
    }
  }

  // map click or GPS position: the parcel under that point goes into the group
  function pickAt(lat: number, lon: number) {
    if (!isAdding) void load(() => getParcelByPoint(lat, lon));
  }

  function handleSubmit() {
    if (!canSave) return;
    resetErrors();
    create.mutate(
      { name: trimmedName, parcelIds: parcels.map((parcel) => parcel.id) },
      { onSuccess: () => void navigate('/konto') },
    );
  }

  const suggestions = recent.filter((item) => !parcels.some((parcel) => parcel.id === item.id));

  return (
    // not a <form>: ParcelSearch has its own forms inside (nested forms are invalid)
    <Stack spacing={3} sx={{ maxWidth: 1280 }}>
      <Box>
        <Typography variant="h1">Dodaj grupę działek</Typography>
        {/* T-103: short explanation of what a group is, before the form */}
        <Alert severity="info" icon={false} sx={{ ...BIG_TEXT, mt: 1, maxWidth: 760 }}>
          <b>Grupa działek</b> to kilka działek, które uprawiasz <b>razem, jak jedno pole</b> – np.
          sąsiednie działki pod tą samą uprawą. Sprawdzisz je <b>jednym raportem</b> zamiast każdej
          osobno.
        </Alert>
        <Typography sx={{ ...BIG_TEXT, mt: 1.5 }}>
          Podaj <b>nazwę grupy</b> i dodaj <b>co najmniej 2 działki</b>.
        </Typography>
      </Box>

      <TextField
        label="Nazwa grupy działek"
        placeholder="np. Pole za stodołą"
        value={name}
        onChange={(event) => setName(event.target.value)}
        slotProps={{
          htmlInput: { maxLength: MAX_NAME, style: BIG_TEXT },
          inputLabel: { style: BIG_TEXT },
        }}
        required
        sx={{ maxWidth: 560 }}
      />

      {/* T-103: lg+ two columns – the parcels in the group on the left (sticky, always in view
          while clicking the map), the search with the map on the right; phones: list above */}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 380px) minmax(0, 1fr)' },
          alignItems: 'start',
        }}
      >
        <Box
          component="section"
          aria-labelledby="field-parcels-title"
          sx={{
            position: { lg: 'sticky' },
            top: { lg: 16 },
            maxHeight: { lg: 'calc(100vh - 32px)' },
            overflowY: { lg: 'auto' },
            p: 2,
            border: 1,
            borderColor: 'kropla.line',
            borderRadius: '16px',
            bgcolor: 'background.paper',
          }}
        >
          <Typography id="field-parcels-title" variant="h2" sx={{ mb: 1 }}>
            Działki w grupie ({parcels.length})
          </Typography>
          {parcels.length === 0 ? (
            <Typography color="text.secondary" sx={BIG_TEXT}>
              Nie dodano jeszcze żadnej działki.
            </Typography>
          ) : (
            <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {parcels.map((parcel) => (
                <li key={parcel.id}>
                  <Card variant="outlined">
                    <CardContent
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        '&:last-child': { pb: 2 },
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ ...BIG_TEXT, fontWeight: 600 }}>
                          Działka {parcel.parcelNumber}
                        </Typography>
                        <Typography sx={{ fontSize: 16 }} color="text.secondary">
                          {parcel.region} · {formatHa(parcel.areaHa)}
                        </Typography>
                      </Box>
                      <Button
                        type="button"
                        color="inherit"
                        startIcon={<DeleteOutlineIcon aria-hidden />}
                        onClick={() => {
                          resetErrors();
                          setParcels((current) => current.filter((item) => item.id !== parcel.id));
                        }}
                        sx={{ minHeight: 48, fontSize: 16 }}
                      >
                        Usuń z listy
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </Stack>
          )}
          {parcels.length > 0 && (
            <Typography sx={{ ...BIG_TEXT, fontWeight: 700, mt: 1 }}>
              Razem: {formatHa(totalHa)}
            </Typography>
          )}
        </Box>

        <Stack spacing={2} sx={{ minWidth: 0 }}>
          {/* T-103: same search as „Dodaj działkę” (number / address / GPS / map); every parcel
              found or clicked goes into the group */}
          <ParcelSearch
            isLoading={isAdding}
            onSearch={(id) => {
              if (!isAdding) void load(() => getParcelById(id));
            }}
            onLocate={pickAt}
            onPlaceFound={(lat, lon, bounds) => setFocus({ lat, lon, bounds })}
            mapSlot={
              <Box
                component="section"
                aria-label="Mapa: klikaj działki do grupy"
                sx={{
                  minWidth: 0,
                  border: 1,
                  borderColor: 'kropla.line',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                }}
              >
                <ParcelMap
                  parcel={null}
                  selectedParcels={parcels}
                  focus={focus}
                  height={{ xs: 320, md: 480 }}
                  isLoading={isAdding}
                  errorMessage={null}
                  layerToggleInCorner
                  showParcelBoundaries
                  onPick={pickAt}
                />
              </Box>
            }
          />
          {isAdding && (
            <Stack direction="row" spacing={1.5} role="status" alignItems="center">
              <CircularProgress size={24} aria-hidden />
              <Typography sx={BIG_TEXT}>Dodajemy działkę…</Typography>
            </Stack>
          )}
          {addError && (
            <Alert severity="error" role="alert" sx={BIG_TEXT}>
              {addError}
            </Alert>
          )}

          {suggestions.length > 0 && (
            <Stack spacing={1} component="section" aria-label="Ostatnie działki">
              <Typography
                variant="subtitle2"
                component="h2"
                color="text.secondary"
                sx={{ fontSize: 16 }}
              >
                Ostatnie działki
              </Typography>
              <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
                {suggestions.map((item) => (
                  <Chip
                    key={item.id}
                    clickable
                    variant="outlined"
                    label={`Dodaj: ${item.label}`}
                    disabled={isAdding}
                    onClick={() => void load(() => getParcelById(item.id))}
                    sx={{
                      minHeight: 48,
                      fontSize: 16,
                      maxWidth: '100%',
                      '& .MuiChip-label': { whiteSpace: 'normal' },
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Box>

      {submitError && (
        <Alert severity="error" role="alert" sx={BIG_TEXT}>
          {submitError}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Button
          type="button"
          onClick={handleSubmit}
          variant="contained"
          size="large"
          disabled={!canSave}
          startIcon={
            create.isPending ? <CircularProgress size={20} /> : <SaveOutlinedIcon aria-hidden />
          }
          sx={BIG_BUTTON}
        >
          Zapisz grupę działek
        </Button>
        {parcels.length < 2 && (
          <Typography color="text.secondary" sx={{ fontSize: 16 }}>
            Wybierz co najmniej 2 działki
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
