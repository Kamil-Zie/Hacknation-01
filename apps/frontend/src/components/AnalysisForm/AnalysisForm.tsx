// UI-C-004 AnalysisForm: crop select and analysis date with validation (RHF + Zod), submit button
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, CircularProgress, MenuItem, Stack, TextField } from '@mui/material';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';

import type { Crop } from '@/api/types';
import {
  createAnalysisFormSchema,
  getMinDateIso,
  getTodayIso,
} from '@/components/AnalysisForm/AnalysisForm.schema';
import type { AnalysisFormValues } from '@/components/AnalysisForm/AnalysisForm.schema';

interface AnalysisFormProps {
  crops: Crop[];
  /** YYYY-MM-DD, defaults to today */
  defaultDate?: string;
  defaultCropCode?: string;
  isSubmitting?: boolean;
  onSubmit: (values: { cropCode: string; analysisDate: string }) => void;
}

export function AnalysisForm({
  crops,
  defaultDate,
  defaultCropCode,
  isSubmitting = false,
  onSubmit,
}: AnalysisFormProps) {
  const schema = useMemo(() => createAnalysisFormSchema(), []);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AnalysisFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { cropCode: defaultCropCode ?? '', analysisDate: defaultDate ?? getTodayIso() },
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} noValidate>
      <Stack spacing={2}>
        <Controller
          name="cropCode"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Uprawa"
              fullWidth
              required
              disabled={isSubmitting}
              error={Boolean(errors.cropCode)}
              helperText={errors.cropCode?.message}
              FormHelperTextProps={{ role: errors.cropCode ? 'alert' : undefined }}
            >
              {crops.map((crop) => (
                <MenuItem key={crop.code} value={crop.code} sx={{ minHeight: 44 }}>
                  {crop.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          name="analysisDate"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              type="date"
              label="Data analizy"
              fullWidth
              required
              disabled={isSubmitting}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: getMinDateIso(), max: getTodayIso() }}
              error={Boolean(errors.analysisDate)}
              helperText={errors.analysisDate?.message}
              FormHelperTextProps={{ role: errors.analysisDate ? 'alert' : undefined }}
            />
          )}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{ minHeight: 44, width: { xs: '100%', md: 'auto' }, alignSelf: { md: 'flex-start' } }}
        >
          {isSubmitting ? 'Analizuję…' : 'Analizuj'}
        </Button>
      </Stack>
    </form>
  );
}
