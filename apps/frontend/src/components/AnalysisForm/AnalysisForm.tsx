// UI-C-004 AnalysisForm: crop tiles and analysis day with validation (RHF + Zod), back and submit buttons (Kropla design)
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
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
  // T-103: crop categories start folded; a category with the chosen crop starts open
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const preselected = crops.find((crop) => crop.code === defaultCropCode);
    const category = preselected ? groupCropsByCategory([preselected])[0]?.category : undefined;
    return category ? [category] : [];
  });
  const toggleGroup = (category: string) =>
    setOpenGroups((current) =>
      current.includes(category)
        ? current.filter((entry) => entry !== category)
        : [...current, category],
    );
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
                <Stack spacing={1}>
                  {groups.map((group) => {
                    // T-103: categories fold so the page is not a wall of buttons; open on click,
                    // while searching, or when the chosen crop is inside
                    const selectedHere = group.crops.find((crop) => crop.code === field.value);
                    const isOpen = query !== '' || openGroups.includes(group.category);
                    const panelId = `crop-panel-${group.category}`;
                    return (
                      <Box
                        key={group.category}
                        sx={{ border: 1, borderColor: 'kropla.line', borderRadius: '14px' }}
                      >
                        <Typography
                          variant="h3"
                          component="h2"
                          id={`crop-group-${group.category}`}
                          sx={{ m: 0 }}
                        >
                          <ButtonBase
                            aria-expanded={isOpen}
                            aria-controls={panelId}
                            onClick={() => toggleGroup(group.category)}
                            sx={{
                              width: '100%',
                              minHeight: 56,
                              px: 2,
                              gap: 1.5,
                              justifyContent: 'flex-start',
                              textAlign: 'left',
                              borderRadius: '14px',
                              fontSize: '1.125rem',
                              fontWeight: 700,
                              '&:hover': { bgcolor: 'action.hover' },
                              '&.Mui-focusVisible': { outline: 2, outlineColor: 'primary.main' },
                            }}
                          >
                            <ExpandMoreIcon
                              aria-hidden
                              sx={{
                                transition: 'transform 150ms',
                                transform: isOpen ? 'rotate(180deg)' : 'none',
                              }}
                            />
                            <Box component="span" sx={{ flex: 1 }}>
                              {group.category}
                              <Box
                                component="span"
                                sx={{ color: 'text.secondary', fontWeight: 400 }}
                              >
                                {` (${group.crops.length})`}
                              </Box>
                            </Box>
                            {selectedHere && !isOpen && (
                              <Box
                                component="span"
                                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                              >
                                <CheckCircleIcon aria-hidden sx={{ color: 'primary.main' }} />
                                {selectedHere.name}
                              </Box>
                            )}
                          </ButtonBase>
                        </Typography>
                        {isOpen && (
                          <Box
                            id={panelId}
                            role="radiogroup"
                            aria-labelledby={`crop-group-${group.category}`}
                            sx={{ px: { xs: 1.5, md: 2 }, pb: { xs: 1.5, md: 2 } }}
                          >
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                  // one column below 600 px: with 18 px text two columns split words ("Kukurydz-a")
                                  xs: 'minmax(0, 1fr)',
                                  sm: 'repeat(2, minmax(0, 1fr))',
                                  md: 'repeat(auto-fill, minmax(240px, 1fr))',
                                },
                                gap: { xs: 1.25, md: 1.75 },
                              }}
                            >
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
                                        gap: { xs: 1, md: 1.75 },
                                        minHeight: { xs: 80, md: 88 },
                                        width: '100%',
                                        px: { xs: 1.5, md: 2.5 },
                                        minWidth: 0,
                                      }}
                                    >
                                      <CropIcon
                                        cropCode={crop.code}
                                        sx={{ fontSize: { xs: 30, md: 44 }, flexShrink: 0 }}
                                      />
                                      <Typography
                                        component="span"
                                        sx={{
                                          flex: 1,
                                          minWidth: 0,
                                          fontWeight: 700,
                                          fontSize: { xs: '1.125rem', md: '1.375rem' },
                                          lineHeight: 1.2,
                                          // break between words only (360 px tiles split "Psze-nica" with 'anywhere')
                                          overflowWrap: 'break-word',
                                          hyphens: 'auto',
                                        }}
                                      >
                                        {crop.name}
                                      </Typography>
                                      {isSelected && (
                                        <CheckCircleIcon
                                          aria-hidden
                                          sx={{
                                            color: 'kropla.iconMuted',
                                            fontSize: { xs: 26, md: 30 },
                                            // on phones the highlighted tile already shows the choice; keep the width for the name
                                            display: { xs: 'none', sm: 'inline-flex' },
                                          }}
                                        />
                                      )}
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
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
