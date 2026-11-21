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
  }
  interface PaletteOptions {
    drought?: DroughtPalette;
    confidence?: ConfidencePalette;
    parcel?: ParcelPalette;
    water?: string;
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

export const theme = createTheme({
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1280, xl: 1920 } },
  palette: {
    primary: { main: '#357A1F', contrastText: '#FFFFFF' },
    // Light accent: backgrounds and highlights only, always with dark text (11.7:1), never as text or lines.
    secondary: { main: '#C4D9FF', contrastText: '#1B1F1A' },
    background: { default: '#FFFFFF', paper: '#FFFFFF' },
    text: { primary: '#1B1F1A', secondary: '#4A5248' },
    divider: '#DDE1D8',
    drought: { none: '#2E7D32', moderate: '#B26A00', severe: '#C62828', unknown: '#6B7280' },
    confidence: { high: '#2E7D32', medium: '#B26A00', low: '#C62828' },
    parcel: { stroke: '#293698', fill: 'rgba(41,54,152,0.15)' },
    water: '#2A9FD6',
  },
  typography: {
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontSize: 16,
    h1: { fontSize: 'clamp(1.75rem, 1.2rem + 2vw, 2.75rem)', fontWeight: 700 },
    h2: { fontSize: 'clamp(1.375rem, 1.1rem + 1vw, 2rem)', fontWeight: 700 },
    h3: { fontSize: '1.25rem', fontWeight: 600 },
    body1: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.5 },
    caption: { fontSize: '0.875rem', fontWeight: 400 },
    metric: {
      fontSize: 'clamp(1.5rem, 1.2rem + 1vw, 2.25rem)',
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
    },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  spacing: 8,
  shape: { borderRadius: 12 },
  // White page and white cards: cards get a divider border instead of a shadow to stay visible.
  components: {
    MuiCard: { defaultProps: { variant: 'outlined' } },
  },
});
