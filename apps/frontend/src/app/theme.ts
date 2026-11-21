// T-001 MUI theme from contracts/ui.json design_tokens (only source of colors, fonts, spacing)
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#2E6B3F', contrastText: '#FFFFFF' },
    secondary: { main: '#1F6FB2' },
    background: { default: '#F6F7F3', paper: '#FFFFFF' },
    text: { primary: '#1B1F1A', secondary: '#4A5248' },
    divider: '#DDE1D8',
  },
  typography: {
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  spacing: 8,
  shape: { borderRadius: 12 },
});
