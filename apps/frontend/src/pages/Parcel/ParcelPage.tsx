// UI-S-002 Uprawa, data i analiza: parcel from API-001, AnalysisForm, SourceProgressList during API-004, redirect to report (T-104 view-only roles)
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

import { useCreateAnalysisMutation } from '@/api/analyses';
import { ApiError } from '@/api/client';
import { useCrops } from '@/api/crops';
import { useParcelQuery } from '@/api/parcels';
import { useSources } from '@/api/sources';
import type { CropCode, Report } from '@/api/types';
import { AnalysisForm } from '@/components/AnalysisForm/AnalysisForm';
import { SourceProgressList } from '@/components/SourceProgressList/SourceProgressList';
import { useSelectionStore } from '@/store/selection';
import { useCanEdit, useSessionStore } from '@/store/session';
import { errorMessage } from '@/utils/errorMessages';

const EXAMPLE_PARCEL_ID = '061409_2.0009.612';

const TICK_MS = 200;
const RESULT_PREVIEW_MS = 1500;
const MAX_ANALYSIS_MS = 40_000;

interface FormValues {
  cropCode: string;
  analysisDate: string;
}

function decodeId(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

// T-051: 404/422 are specific to the analysis; everything else goes through the shared map
function toMessage(error: unknown): { message: string; canRetry: boolean } {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return { message: 'Nie znaleziono działki lub uprawy dla tej analizy.', canRetry: false };
    }
    if (error.status === 422) {
      return { message: `Nieprawidłowe dane analizy: ${error.message}`, canRetry: false };
    }
  }
  return errorMessage(error);
}

export function ParcelPage() {
  const navigate = useNavigate();
  const parcelId = decodeId(useParams().parcelId);
  const storedParcel = useSelectionStore((state) => state.parcel);
  const setParcel = useSelectionStore((state) => state.setParcel);
  const isExample = useSelectionStore((state) => state.isExample);
  const hasStored = storedParcel !== null && storedParcel.id === parcelId;
  const parcelQuery = useParcelQuery(hasStored ? null : parcelId);
  const parcel = hasStored ? storedParcel : (parcelQuery.data ?? null);
  const cropsQuery = useCrops();
  const sourcesQuery = useSources();
  const mutation = useCreateAnalysisMutation();
  const token = useSessionStore((state) => state.token);
  const activeAccountId = useSessionStore((state) => state.activeAccountId);
  // T-104 member and guest: the analysis is shown but not saved in the account
  const canEdit = useCanEdit();
  const activeAccountName = useSessionStore(
    (state) => state.accounts.find((account) => account.id === state.activeAccountId)?.name,
  );

  const [values, setValues] = useState<FormValues | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [localError, setLocalError] = useState<unknown>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout>>();
  // Bumped on submit, local timeout and retry, so a late API-004 response is ignored
  const attemptRef = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (parcelQuery.data && !hasStored) setParcel(parcelQuery.data);
  }, [parcelQuery.data, hasStored, setParcel]);

  const isAnalyzing = mutation.isPending && report === null;

  useEffect(() => {
    if (!isAnalyzing) return;
    const start = Date.now();
    setElapsedMs(0);
    const timer = setInterval(() => setElapsedMs(Date.now() - start), TICK_MS);
    return () => clearInterval(timer);
  }, [isAnalyzing]);

  useEffect(() => {
    if (isAnalyzing && elapsedMs > MAX_ANALYSIS_MS) {
      attemptRef.current += 1;
      setLocalError(new ApiError('TIMEOUT', 'Przekroczono czas analizy', 0));
    }
  }, [isAnalyzing, elapsedMs]);

  useEffect(() => () => clearTimeout(navTimer.current), []);

  function handleSubmit(formValues: FormValues) {
    // Guard against a fast double click sending two POST API-004
    if (!parcelId || mutation.isPending) return;
    clearTimeout(navTimer.current);
    attemptRef.current += 1;
    const attempt = attemptRef.current;
    setValues(formValues);
    setLocalError(null);
    mutation.mutate(
      {
        request: {
          parcelId,
          cropCode: formValues.cropCode as CropCode,
          analysisDate: formValues.analysisDate,
        },
        options: { accountId: token && canEdit ? activeAccountId : null, token },
      },
      {
        onSuccess: (created) => {
          if (attempt !== attemptRef.current) return;
          setReport(created);
          navTimer.current = setTimeout(
            () => navigate(`/report/${encodeURIComponent(created.id)}`),
            RESULT_PREVIEW_MS,
          );
        },
      },
    );
  }

  function handleRetry() {
    attemptRef.current += 1;
    mutation.reset();
    setLocalError(null);
    setReport(null);
  }

  // T-051: on 504 resend the analysis with the remembered values
  function handleResend() {
    if (!values) return handleRetry();
    handleRetry();
    handleSubmit(values);
  }

  const parcelError = !hasStored && parcelQuery.isError ? parcelQuery.error : null;
  const analysisError = localError ?? (mutation.isError ? mutation.error : null);
  const analysisCanRetry = analysisError !== null && toMessage(analysisError).canRetry;
  const showExample = isExample && parcelId === EXAMPLE_PARCEL_ID;
  const isLoading =
    !parcelError && (!parcel || cropsQuery.isPending || sourcesQuery.isPending) && !analysisError;
  const showProgress = (isAnalyzing || report !== null) && !analysisError;

  useEffect(() => {
    if (showProgress) panelRef.current?.focus();
  }, [showProgress]);

  let panel;
  if (parcelError) {
    panel = (
      <Alert
        severity="error"
        role="alert"
        action={
          <Button component={RouterLink} to="/" color="inherit" sx={{ minHeight: 44 }}>
            Wróć do wyszukiwania
          </Button>
        }
      >
        {parcelError instanceof ApiError && parcelError.status === 404
          ? 'Nie znaleziono działki o podanym identyfikatorze.'
          : toMessage(parcelError).message}
      </Alert>
    );
  } else if (cropsQuery.isError || sourcesQuery.isError) {
    panel = (
      <Alert
        severity="error"
        role="alert"
        action={
          <Button
            color="inherit"
            sx={{ minHeight: 44 }}
            onClick={() => {
              void cropsQuery.refetch();
              void sourcesQuery.refetch();
            }}
          >
            Spróbuj ponownie
          </Button>
        }
      >
        Nie udało się pobrać listy upraw lub źródeł danych.
      </Alert>
    );
  } else if (isLoading) {
    panel = <LinearProgress aria-label="Ładowanie danych" />;
  } else if (showProgress) {
    panel = (
      <SourceProgressList
        sources={sourcesQuery.data?.items ?? []}
        statuses={report?.sources ?? null}
        elapsedMs={elapsedMs}
      />
    );
  } else if (analysisError !== null) {
    panel = (
      <Alert
        severity="error"
        role="alert"
        action={
          <Button
            color="inherit"
            sx={{ minHeight: 44 }}
            onClick={analysisCanRetry ? handleResend : handleRetry}
          >
            {analysisCanRetry ? 'Ponów' : 'Spróbuj ponownie'}
          </Button>
        }
      >
        {toMessage(analysisError).message}
      </Alert>
    );
  } else {
    panel = (
      <Stack spacing={1}>
        <AnalysisForm
          crops={cropsQuery.data?.items ?? []}
          defaultCropCode={values?.cropCode ?? (showExample ? 'winter_wheat' : undefined)}
          defaultDate={values?.analysisDate ?? (showExample ? '2026-05-25' : undefined)}
          isSubmitting={mutation.isPending}
          backTo="/"
          onSubmit={handleSubmit}
        />
        {showExample && (
          <Typography variant="caption" color="text.secondary">
            Przykład: pszenica ozima, 25 maja 2026 (susza na działce w Bronowicach)
          </Typography>
        )}
        {token && activeAccountName && (
          <Typography variant="caption" color="text.secondary">
            Raport zapiszemy w: {activeAccountName}
          </Typography>
        )}
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 1120, mx: 'auto' }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px 24px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack spacing={1}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', color: 'primary.main' }}>
            KROK 2 Z 3
          </Typography>
          <Typography variant="h1">Co rośnie na działce?</Typography>
          {parcel && (
            <Typography color="text.secondary">
              {parcel.commune} · {parcel.areaHa.toLocaleString('pl-PL')} ha
            </Typography>
          )}
        </Stack>
        {parcel && (
          <Box
            component="section"
            aria-label="Wybrana działka"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.25,
              maxWidth: '100%',
              bgcolor: 'background.paper',
              border: 2,
              borderColor: 'kropla.iconMuted',
              borderRadius: '9999px',
              px: 2.25,
              py: 1.25,
            }}
          >
            <PlaceOutlinedIcon aria-hidden sx={{ color: 'kropla.iconMuted' }} />
            <Typography
              sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}
            >
              Działka {parcel.id}
            </Typography>
          </Box>
        )}
      </Box>
      {/* Always-mounted live region; focus moves here after „Pokaż raport” (T-026 a11y) */}
      <Box ref={panelRef} tabIndex={-1} aria-live="polite" sx={{ outline: 'none' }}>
        {panel}
      </Box>
    </Stack>
  );
}
