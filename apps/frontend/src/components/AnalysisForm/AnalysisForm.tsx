// UI-C-004 AnalysisForm: crop tiles and analysis day with validation (RHF + Zod), back and submit buttons (Kropla design)
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';

import type { Crop } from '@/api/types';
import {
  createAnalysisFormSchema,
  getMinDateIso,
  getTodayIso,
} from '@/components/AnalysisForm/AnalysisForm.schema';
import type { AnalysisFormValues } from '@/components/AnalysisForm/AnalysisForm.schema';
import { CropIcon } from '@/components/CropIcon/CropIcon';

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
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AnalysisFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { cropCode: defaultCropCode ?? '', analysisDate: defaultDate ?? today },
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} noValidate>
      <Stack spacing={3}>
        <Controller
          name="cropCode"
          control={control}
          render={({ field }) => (
            <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
              <Box component="legend" sx={{ position: 'absolute', left: -10000 }}>
                Uprawa
              </Box>
              <Box
                role="radiogroup"
                aria-label="Uprawa"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(auto-fill, minmax(240px, 1fr))',
                  },
                  gap: { xs: 1.25, md: 1.75 },
                }}
              >
                {crops.map((crop) => {
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
                            fontSize: { xs: '1rem', md: '1.375rem' },
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
              {errors.cropCode && (
                <Typography role="alert" color="error" sx={{ mt: 1, fontWeight: 600 }}>
                  {errors.cropCode.message}
                </Typography>
              )}
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
