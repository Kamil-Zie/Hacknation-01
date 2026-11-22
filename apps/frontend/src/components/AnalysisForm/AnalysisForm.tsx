// UI-C-004 AnalysisForm: crop tiles and analysis day with validation (RHF + Zod), back and submit buttons (Kropla design)
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SearchIcon from '@mui/icons-material/Search';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';

import type { Crop } from '@/api/types';
import {
  createAnalysisFormSchema,
  getMinDateIso,
  getTodayIso,
} from '@/components/AnalysisForm/AnalysisForm.schema';
import type { AnalysisFormValues } from '@/components/AnalysisForm/AnalysisForm.schema';
import { CropIcon } from '@/components/CropIcon/CropIcon';
import { groupCropsByCategory, normalizeSearch } from '@/utils/cropCategories';

interface AnalysisFormProps {
  crops: Crop[];
  /** YYYY-MM-DD, defaults to today */
  defaultDate?: string;
  defaultCropCode?: string;
  isSubmitting?: boolean;
  /** Where the "Wstecz" button leads */
  backTo?: string;
  onSubmit: (values: { cropCode: string; analysisDate: string }) => void;
}

// Radio tile: native hidden input gives arrow-key behaviour, the label is the visible tile
const tileSx = (isSelected: boolean) => (theme: Theme) => ({
  position: 'relative',
  display: 'flex',
  cursor: 'pointer',
  borderRadius: '14px',
  border: isSelected ? 3 : 2,
  borderStyle: 'solid',
  borderColor: isSelected ? theme.palette.kropla.iconMuted : theme.palette.kropla.line,
  bgcolor: isSelected ? theme.palette.kropla.tint : theme.palette.background.paper,
  '&:focus-within': { outline: `3px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
  '& input': {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    m: 0,
    cursor: 'pointer',
  },
});

// search box appears only when the list is long enough to need it
const SEARCH_MIN_CROPS = 9;

const DAY_FORMAT = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' });

export function AnalysisForm({
  crops,
  defaultDate,
  defaultCropCode,
  isSubmitting = false,
  backTo = '/',
  onSubmit,
}: AnalysisFormProps) {
  const schema = useMemo(() => createAnalysisFormSchema(), []);
  const today = getTodayIso();
  const [isOtherDay, setIsOtherDay] = useState(defaultDate !== undefined && defaultDate !== today);
  const [search, setSearch] = useState('');
  const cropSectionRef = useRef<HTMLFieldSetElement>(null);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AnalysisFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { cropCode: defaultCropCode ?? '', analysisDate: defaultDate ?? today },
  });

  const hasSearch = crops.length >= SEARCH_MIN_CROPS;
  const query = hasSearch ? normalizeSearch(search) : '';
  const groups = useMemo(
    () =>
      groupCropsByCategory(
        query ? crops.filter((crop) => normalizeSearch(crop.name).includes(query)) : crops,
      ),
    [crops, query],
  );

  function handleInvalid(formErrors: FieldErrors<AnalysisFormValues>) {
    if (!formErrors.cropCode) return;
    const section = cropSectionRef.current;
    section?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    section?.focus({ preventScroll: true });
  }

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values), handleInvalid)} noValidate>
      <Stack spacing={3}>
        <Controller
          name="cropCode"
          control={control}
          render={({ field }) => (
            <Box
              component="fieldset"
              ref={cropSectionRef}
              tabIndex={-1}
              sx={(theme) => ({
                border: errors.cropCode ? 3 : 0,
                borderStyle: 'solid',
                borderColor: theme.palette.error.main,
                borderRadius: '14px',
                p: errors.cropCode ? 1.5 : 0,
                m: 0,
                minWidth: 0,
                outline: 'none',
              })}
            >
              <Box component="legend" sx={{ position: 'absolute', left: -10000 }}>
                Uprawa
              </Box>
              <Stack spacing={2.5}>
                {errors.cropCode && (
                  <Alert severity="warning" role="alert" sx={{ fontSize: '1.125rem' }}>
                    Wybierz, co rośnie na działce
                  </Alert>
                )}
                {hasSearch && (
                  <TextField
                    type="search"
                    label="Szukaj uprawy"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon aria-hidden />
                          </InputAdornment>
                        ),
                        sx: { minHeight: 48, fontSize: '1.125rem' },
                      },
                      inputLabel: { sx: { fontSize: '1.125rem' } },
                    }}
                    sx={{ maxWidth: { sm: 420 } }}
                  />
                )}
                {groups.length === 0 && (
                  <Typography sx={{ fontSize: '1.125rem' }}>
                    Nie ma takiej uprawy. Sprawdź pisownię.
                  </Typography>
                )}
                {/* T-103: two categories per column (stacked), columns side by side, all open,
                    compact tiles: the whole crop list fits in one short block */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'minmax(0, 1fr)',
                      sm: 'repeat(2, minmax(0, 1fr))',
                      lg: 'repeat(4, minmax(0, 1fr))',
                    },
                    gap: 2,
                    alignItems: 'start',
                  }}
                >
                  {groups
                    .reduce<(typeof groups)[]>((columns, group, index) => {
                      if (index % 2 === 0) columns.push([group]);
                      else columns[columns.length - 1]?.push(group);
                      return columns;
                    }, [])
                    .map((column) => (
                      <Stack key={column.map((group) => group.category).join('|')} spacing={2}>
                        {column.map((group) => (
                          <Box
                            key={group.category}
                            role="radiogroup"
                            aria-labelledby={`crop-group-${group.category}`}
                            sx={{
                              border: 1,
                              borderColor: 'kropla.line',
                              borderRadius: '14px',
                              p: 1.5,
                              minWidth: 0,
                              bgcolor: 'background.paper',
                            }}
                          >
                            <Typography
                              variant="h3"
                              component="h2"
                              id={`crop-group-${group.category}`}
                              sx={{
                                fontSize: '1.25rem',
                                fontWeight: 800,
                                mb: 1.25,
                                px: 0.5,
                                pb: 0.75,
                                borderBottom: 1,
                                borderColor: 'divider',
                              }}
                            >
                              {group.category}
                            </Typography>
                            <Stack spacing={1}>
                              {group.crops.map((crop) => {
                                const isSelected = field.value === crop.code;
                                return (
                                  <Box component="label" key={crop.code} sx={tileSx(isSelected)}>
                                    <input
                                      type="radio"
                                      name="cropCode"
                                      value={crop.code}
                                      checked={isSelected}
                                      disabled={isSubmitting}
                                      onChange={() => field.onChange(crop.code)}
                                      onBlur={field.onBlur}
                                    />
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        minHeight: 64,
                                        width: '100%',
                                        px: 1.75,
                                        minWidth: 0,
                                      }}
                                    >
                                      <CropIcon
                                        cropCode={crop.code}
                                        sx={{ fontSize: 36, flexShrink: 0 }}
                                      />
                                      <Typography
                                        component="span"
                                        sx={{
                                          flex: 1,
                                          minWidth: 0,
                                          fontWeight: 700,
                                          fontSize: '1.25rem',
                                          lineHeight: 1.2,
                                          // break between words only
                                          overflowWrap: 'break-word',
                                          hyphens: 'auto',
                                        }}
                                      >
                                        {crop.name}
                                      </Typography>
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    ))}
                </Box>
              </Stack>
            </Box>
          )}
        />

        <Typography variant="h2" component="h2" sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
          Na który dzień?
        </Typography>
        <Controller
          name="analysisDate"
          control={control}
          render={({ field }) => (
            <Stack spacing={2}>
              <Box
                role="radiogroup"
                aria-label="Dzień"
                sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.75 }}
              >
                {[
                  { id: 'today', label: 'Dziś', sub: DAY_FORMAT.format(new Date()) },
                  { id: 'other', label: 'Inny dzień', sub: 'Wybierz z kalendarza' },
                ].map((day) => {
                  const isSelected = (day.id === 'other') === isOtherDay;
                  return (
                    <Box
                      component="label"
                      key={day.id}
                      sx={[
                        tileSx(isSelected),
                        { flex: { xs: '1 1 100%', sm: '0 1 240px' }, minHeight: 76 },
                      ]}
                    >
                      <input
                        type="radio"
                        name="dayChoice"
                        value={day.id}
                        checked={isSelected}
                        disabled={isSubmitting}
                        onChange={() => {
                          setIsOtherDay(day.id === 'other');
                          if (day.id === 'today') setValue('analysisDate', today);
                        }}
                      />
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          px: 2.75,
                          width: '100%',
                        }}
                      >
                        <Typography
                          component="span"
                          sx={{ fontWeight: 700, fontSize: '1.3125rem' }}
                        >
                          {day.label}
                        </Typography>
                        <Typography component="span" color="text.secondary">
                          {day.sub}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
              {(isOtherDay || errors.analysisDate) && (
                <TextField
                  {...field}
                  type="date"
                  label="Data analizy"
                  required
                  disabled={isSubmitting}
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { min: getMinDateIso(), max: today },
                    formHelperText: { role: errors.analysisDate ? 'alert' : undefined },
                  }}
                  error={Boolean(errors.analysisDate)}
                  helperText={errors.analysisDate?.message}
                  sx={{ maxWidth: { sm: 320 } }}
                />
              )}
            </Stack>
          )}
        />

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.75,
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 1,
            pt: 3,
            borderTop: 1,
            borderColor: 'kropla.line',
          }}
        >
          <Button
            component={RouterLink}
            to={backTo}
            variant="outlined"
            color="inherit"
            size="large"
            startIcon={<ArrowBackIcon aria-hidden />}
            sx={{ minHeight: 64, px: 3, borderColor: 'text.secondary', fontSize: '1.25rem' }}
          >
            Wstecz
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={22} color="inherit" /> : undefined}
            endIcon={isSubmitting ? undefined : <ArrowForwardIcon aria-hidden />}
            sx={{
              minHeight: 72,
              px: 4,
              fontSize: { xs: '1.1875rem', md: '1.375rem' },
              flexGrow: { xs: 1, sm: 0 },
            }}
          >
            {isSubmitting ? 'Analizuję…' : 'Pokaż raport o wodzie'}
          </Button>
        </Box>
      </Stack>
    </form>
  );
}
