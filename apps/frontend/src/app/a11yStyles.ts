// T-084 Global accessibility styles: visible focus, high contrast (html.high-contrast), Windows forced colors, reduced motion
import type { Interpolation, Theme } from '@mui/material/styles';

const HC_BG = '#000000';
const HC_TEXT = '#FFFFFF';
const HC_ACCENT = '#FFFF00';

// Everything except map tiles/overlays, images and SVG internals (charts, icons keep their own drawing).
// :where() keeps the specificity low, so the link, button and pressed-state rules below win.
const HC_ALL =
  'html.high-contrast #root :where(*:not(img):not(svg):not(svg *):not(.leaflet-pane):not(.leaflet-pane *):not(.MuiTouchRipple-root):not(.MuiTouchRipple-root *))';

export const a11yStyles: Interpolation<Theme> = {
  // Visible focus: 3 px, dark ring with a white halo, so it reads on white pages and on the blue header.
  ':focus-visible': {
    outline: '3px solid #0B2545 !important',
    outlineOffset: '2px',
    boxShadow: '0 0 0 5px #FFFFFF',
  },
  'header :focus-visible, .a11y-bar :focus-visible': {
    outline: '3px solid #FFFFFF !important',
    boxShadow: '0 0 0 5px #0B2545',
  },
  // Map zoom buttons: 44 px touch targets (Leaflet's .leaflet-touch rule sets 30 px).
  '.leaflet-touch .leaflet-bar a.leaflet-control-zoom-in, .leaflet-touch .leaflet-bar a.leaflet-control-zoom-out':
    { width: '44px !important', height: '44px !important', lineHeight: '44px !important' },
  // Field borders: MUI default rgba(0,0,0,0.23) is about 2:1; #6B7280 gives 4.8:1 on white (WCAG 1.4.11).
  '.MuiOutlinedInput-root:not(.Mui-focused):not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
    borderColor: '#6B7280',
  },
  // MUI text fields show focus with their border: make it 3 px instead of an extra outline.
  '.MuiInputBase-input:focus-visible': { outline: 'none !important', boxShadow: 'none' },
  '.MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderWidth: '3px !important',
  },
  '#tresc:focus': { outline: 'none' },

  // High contrast (button in the accessibility bar or system prefers-contrast: more).
  'html.high-contrast, html.high-contrast body, html.high-contrast #root': {
    backgroundColor: `${HC_BG} !important`,
    color: `${HC_TEXT} !important`,
  },
  [HC_ALL]: {
    backgroundColor: `${HC_BG} !important`,
    backgroundImage: 'none !important',
    color: `${HC_TEXT} !important`,
    borderColor: `${HC_TEXT} !important`,
    boxShadow: 'none !important',
    textShadow: 'none !important',
  },
  'html.high-contrast #root a': {
    color: `${HC_ACCENT} !important`,
    textDecoration: 'underline !important',
  },
  'html.high-contrast #root button, html.high-contrast #root [role="button"], html.high-contrast #root .MuiButton-root':
    {
      color: `${HC_ACCENT} !important`,
      border: `2px solid ${HC_ACCENT} !important`,
    },
  'html.high-contrast #root [aria-pressed="true"], html.high-contrast #root [aria-checked="true"], html.high-contrast #root .Mui-selected':
    {
      backgroundColor: `${HC_ACCENT} !important`,
      color: `${HC_BG} !important`,
    },
  'html.high-contrast #root [aria-pressed="true"] *, html.high-contrast #root .Mui-selected *': {
    color: `${HC_BG} !important`,
    backgroundColor: 'transparent !important',
  },
  'html.high-contrast #root input, html.high-contrast #root textarea, html.high-contrast #root select':
    {
      backgroundColor: `${HC_BG} !important`,
      color: `${HC_TEXT} !important`,
    },
  // Chips: the label's black box covered the rounded border; colour the chip, keep the label transparent.
  'html.high-contrast #root .MuiChip-root': { backgroundColor: `${HC_BG} !important` },
  'html.high-contrast #root .MuiChip-label': { backgroundColor: 'transparent !important' },
  // Outline frame sits on top of the field text: border only, no background.
  'html.high-contrast #root .MuiOutlinedInput-notchedOutline, html.high-contrast #root .MuiOutlinedInput-notchedOutline *':
    {
      backgroundColor: 'transparent !important',
    },
  'html.high-contrast #root .MuiOutlinedInput-notchedOutline': {
    borderColor: `${HC_TEXT} !important`,
  },
  'html.high-contrast #root .Mui-error, html.high-contrast #root .Mui-error *': {
    color: `${HC_ACCENT} !important`,
    borderColor: `${HC_ACCENT} !important`,
  },
  'html.high-contrast :focus-visible': {
    outline: `3px solid ${HC_ACCENT} !important`,
    boxShadow: 'none !important',
  },
  // Decorative icons follow the text colour; content images stay untouched.
  'html.high-contrast #root svg.MuiSvgIcon-root': { color: 'inherit !important' },
  'html.high-contrast .MuiMenu-paper, html.high-contrast .MuiPopover-paper, html.high-contrast .MuiDialog-paper, html.high-contrast .MuiSnackbarContent-root, html.high-contrast .MuiAlert-root':
    {
      backgroundColor: `${HC_BG} !important`,
      color: `${HC_TEXT} !important`,
      border: `2px solid ${HC_TEXT}`,
    },
  'html.high-contrast .MuiMenuItem-root, html.high-contrast .MuiMenuItem-root *': {
    color: `${HC_TEXT} !important`,
  },

  // Windows high contrast (forced colors): keep borders on filled buttons and a system-colour focus ring.
  '@media (forced-colors: active)': {
    '.MuiButton-contained, .MuiChip-root, .MuiToggleButton-root': {
      border: '1px solid ButtonText',
    },
    ':focus-visible': { outline: '3px solid Highlight !important', boxShadow: 'none' },
    '.MuiSvgIcon-root': { forcedColorAdjust: 'auto' },
  },

  // Reduced motion: no animations or smooth scrolling.
  '@media (prefers-reduced-motion: reduce)': {
    '*, *::before, *::after': {
      animationDuration: '0.01ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.01ms !important',
      scrollBehavior: 'auto !important',
    },
  },
};

// Hidden visually, still read by screen readers (same as MUI visuallyHidden, without an extra dependency).
export const srOnly = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: '1px',
} as const;
