// T-006 MUI theme from contracts/ui.json design_tokens (only source of colors, fonts, spacing)
import { createTheme } from '@mui/material/styles';
import type { CSSProperties } from 'react';

interface DroughtPalette {
  none: string;
  moderate: string;
  severe: string;
  unknown: string;
}

interface ConfidencePalette {
  high: string;
  medium: string;
  low: string;
}

// Design „Kropla” (design/kropla/KROPLA-WDROZENIE.md): gradients and status fills.
interface KroplaPalette {
  headerGradient: string;
  ctaGradient: string;
  ctaText: string;
  line: string;
  iconMuted: string;
  tint: string;
  alertHigh: string;
  alertMedium: string;
  alertLow: string;
  severeBg: string;
  sliderGradient: string;
  waterDark: string;
  waterLight: string;
  crop: Record<'wheat' | 'maize' | 'rapeseed' | 'potato' | 'beet' | 'grass', string>;
}

interface ParcelPalette {
  stroke: string;
  fill: string;
}

declare module '@mui/material/styles' {
  interface Palette {
    drought: DroughtPalette;
    confidence: ConfidencePalette;
    parcel: ParcelPalette;
    water: string;
    kropla: KroplaPalette;
  }
  interface PaletteOptions {
    drought?: DroughtPalette;
    confidence?: ConfidencePalette;
    parcel?: ParcelPalette;
    water?: string;
    kropla?: KroplaPalette;
  }
  interface TypographyVariants {
    metric: CSSProperties;
  }
  interface TypographyVariantsOptions {
    metric?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    metric: true;
  }
}

const baseTheme = createTheme({
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1280, xl: 1920 } },
  palette: {
    primary: { main: '#1A5FB4', dark: '#154E96', contrastText: '#FFFFFF' },
    // Light accent: backgrounds and highlights only, always with dark text, never as text or lines.
    secondary: { main: '#A8CDF8', light: '#D4E7FC', contrastText: '#0B2545' },
    error: { main: '#C62828' },
    warning: { main: '#F28C28', contrastText: '#1B1F1A' },
    background: { default: '#FFFFFF', paper: '#FFFFFF' },
    text: { primary: '#1B1F1A', secondary: '#4A5248' },
    divider: '#DDE1D8',
    drought: { none: '#2E7D32', moderate: '#B26A00', severe: '#C62828', unknown: '#6B7280' },
    confidence: { high: '#2E7D32', medium: '#B26A00', low: '#C62828' },
    parcel: { stroke: '#293698', fill: 'rgba(41,54,152,0.15)' },
    water: '#2A9FD6',
    kropla: {
      headerGradient: 'linear-gradient(180deg, #1a5fb4 0%, #2a6cc0 100%)',
      ctaGradient: 'linear-gradient(180deg, #a8cdf8 0%, #d4e7fc 100%)',
      ctaText: '#0B2545',
      line: '#DDE1D8',
      // T-084: was #7FB2EE (2.2:1 on white); borders and icons of controls need 3:1 (WCAG 1.4.11)
      iconMuted: '#4A87D0',
      tint: '#E9EEF5',
      alertHigh: '#C62828',
      alertMedium: '#F28C28',
      alertLow: '#F2CF63',
      severeBg: '#FDEEEC',
      sliderGradient:
        'linear-gradient(90deg, #f09a9a 0%, #fbc995 20%, #fbe9ad 35%, #7cc47f 50%, #fbe9ad 65%, #fbc995 80%, #f09a9a 100%)',
      waterDark: '#154E96',
      waterLight: '#9CD3F5',
      crop: {
        wheat: '#C9952B',
        maize: '#E0A800',
        rapeseed: '#D4B800',
        potato: '#8B5E3C',
        beet: '#9B1D4A',
        grass: '#3F8F3A',
      },
    },
  },
  typography: {
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontSize: 16,
    h1: { fontSize: 'clamp(1.75rem, 1.2rem + 2vw, 2.75rem)', fontWeight: 800, lineHeight: 1.15 },
    h2: { fontSize: 'clamp(1.375rem, 1.1rem + 1vw, 2rem)', fontWeight: 800 },
    h3: { fontSize: '1.25rem', fontWeight: 700 },
    body1: { fontSize: '1.125rem', fontWeight: 400, lineHeight: 1.5 },
    caption: { fontSize: '0.875rem', fontWeight: 400 },
    metric: {
      fontSize: 'clamp(1.5rem, 1.2rem + 1vw, 2.25rem)',
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
    },
    button: { textTransform: 'none', fontWeight: 700, fontSize: '1.125rem' },
  },
  spacing: 8,
  shape: { borderRadius: 12 },
  // White page and white cards: cards get a divider border instead of a shadow to stay visible.
  components: {
    MuiCard: { defaultProps: { variant: 'outlined' } },
    // T-083 menu rows ≥ 48 px and 18 px text for users 18–99 (MUI drops minHeight to auto from sm up)
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 48,
          fontSize: '1.125rem',
          '@media (min-width: 600px)': { minHeight: 48 },
        },
      },
    },
    // Kropla: big touch targets, light-blue gradient CTA with dark text
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, minHeight: 44 },
        sizeLarge: { minHeight: 56, fontSize: '1.125rem' },
        containedPrimary: ({ theme: t }) => ({
          minHeight: 56,
          background: t.palette.kropla.ctaGradient,
          color: t.palette.kropla.ctaText,
          boxShadow: 'none',
          '&:hover': { background: t.palette.secondary.main, boxShadow: 'none' },
          '&.Mui-disabled': { background: t.palette.action.disabledBackground },
        }),
        outlined: { borderWidth: 2, '&:hover': { borderWidth: 2 } },
      },
    },
    MuiOutlinedInput: { styleOverrides: { notchedOutline: { borderWidth: 2 } } },
  },
});

// Projector (xl, 1920 px): larger headings and metrics than on 1280 px.
export const theme = createTheme(baseTheme, {
  typography: {
    h1: { [baseTheme.breakpoints.up('xl')]: { fontSize: '3.25rem' } },
    h2: { [baseTheme.breakpoints.up('xl')]: { fontSize: '2.5rem' } },
    h3: { [baseTheme.breakpoints.up('xl')]: { fontSize: '1.5rem' } },
    body1: { [baseTheme.breakpoints.up('xl')]: { fontSize: '1.125rem' } },
    metric: { [baseTheme.breakpoints.up('xl')]: { fontSize: '2.75rem' } },
  },
});
