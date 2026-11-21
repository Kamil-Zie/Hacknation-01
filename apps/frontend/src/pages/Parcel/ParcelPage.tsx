// UI-S-002 Uprawa, data i analiza: parcel from API-001, AnalysisForm, SourceProgressList during API-004, redirect to report
import { Alert, Box, Button, Container, LinearProgress, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

import { useCreateAnalysisMutation } from '@/api/analyses';
import { ApiError } from '@/api/client';
import { useCrops } from '@/api/crops';
import { useParcelQuery } from '@/api/parcels';
import { useSources } from '@/api/sources';
import type { CropCode, Report } from '@/api/types';
import { AnalysisForm } from '@/components/AnalysisForm/AnalysisForm';
import { ParcelMap } from '@/components/ParcelMap/ParcelMap';
import { ParcelSummaryCard } from '@/components/ParcelSummaryCard/ParcelSummaryCard';
import { SourceProgressList } from '@/components/SourceProgressList/SourceProgressList';
import { useSelectionStore } from '@/store/selection';

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

function toMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'TIMEOUT') return 'Analiza trwa zbyt długo. Spróbuj ponownie za chwilę.';
    if (error.code === 'NETWORK_ERROR') return 'Brak połączenia z serwerem. Sprawdź internet.';
    if (error.status === 404) return 'Nie znaleziono działki lub uprawy dla tej analizy.';
    if (error.status === 422) return `Nieprawidłowe dane analizy: ${error.message}`;
    if (error.status === 502 || error.status === 503)
      return 'Zewnętrzne źródła danych są chwilowo niedostępne.';
    return error.message;
  }
  return 'Nie udało się wykonać analizy. Spróbuj ponownie.';
}

export function ParcelPage() {
  const navigate = useNavigate();
  const parcelId = decodeId(useParams().parcelId);
  const storedParcel = useSelectionStore((state) => state.parcel);
  const setParcel = useSelectionStore((state) => state.setParcel);
  const hasStored = storedParcel !== null && storedParcel.id === parcelId;
  const parcelQuery = useParcelQuery(hasStored ? null : parcelId);
  const parcel = hasStored ? storedParcel : (parcelQuery.data ?? null);
  const cropsQuery = useCrops();
  const sourcesQuery = useSources();
  const mutation = useCreateAnalysisMutation();

  const [values, setValues] = useState<FormValues | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [localError, setLocalError] = useState<unknown>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout>>();
  // Bumped on submit, local timeout and retry, so a late API-004 response is ignored
  const attemptRef = useRef(0);

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
        parcelId,
        cropCode: formValues.cropCode as CropCode,
        analysisDate: formValues.analysisDate,
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

  const parcelError = !hasStored && parcelQuery.isError ? parcelQuery.error : null;
  const analysisError = localError ?? (mutation.isError ? mutation.error : null);
  const isLoading =
    !parcelError && (!parcel || cropsQuery.isPending || sourcesQuery.isPending) && !analysisError;
  const showProgress = (isAnalyzing || report !== null) && !analysisError;

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
          : toMessage(parcelError)}
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
          <Button color="inherit" sx={{ minHeight: 44 }} onClick={handleRetry}>
            Spróbuj ponownie
          </Button>
        }
      >
        {toMessage(analysisError)}
      </Alert>
    );
  } else {
    panel = (
      <AnalysisForm
        crops={cropsQuery.data?.items ?? []}
        defaultCropCode={values?.cropCode}
        defaultDate={values?.analysisDate}
        isSubmitting={mutation.isPending}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        // AppLayout: 56 px header + 2 × 32 px main padding, so the map fits a 1280×720 projector
        minHeight: { lg: 'calc(100vh - 120px)' },
        overflowX: 'hidden',
      }}
    >
      <Container
        disableGutters
        maxWidth={false}
        // AppLayout already pads the page, so no extra gutters here (T-026 review)
        sx={{ pr: { lg: 3 }, width: { lg: 480 }, maxWidth: { lg: 480 }, flexShrink: 0 }}
      >
        <Stack spacing={3}>
          <Typography variant="h1">Uprawa, data i analiza</Typography>
          {parcel && <ParcelSummaryCard parcel={parcel} />}
          {panel}
        </Stack>
      </Container>
      <Box
        sx={{
          flex: 1,
          pt: { xs: 2, lg: 0 },
          minWidth: 0,
          display: 'flex',
        }}
      >
        <ParcelMap
          parcel={parcel}
          height={{ xs: '30vh', md: '50vh', lg: '100%' }}
          isInteractive={false}
          isLoading={isLoading}
        />
      </Box>
    </Box>
  );
}
