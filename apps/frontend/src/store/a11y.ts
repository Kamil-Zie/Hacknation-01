// T-084 Accessibility preferences: text size and high contrast, saved in localStorage and applied on <html>
// index.html applies the same keys before the first render (no flash); keep A11Y_KEYS in sync with it.
import { create } from 'zustand';

export type TextSize = 0 | 1 | 2;

export const TEXT_SIZES: { value: TextSize; percent: string; label: string }[] = [
  { value: 0, percent: '100%', label: 'standardowy' },
  { value: 1, percent: '112.5%', label: 'większy' },
  { value: 2, percent: '125%', label: 'największy' },
];

export const A11Y_KEYS = { textSize: 'kropelka-text-size', contrast: 'kropelka-contrast' };

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // private mode or full storage: the choice works until the page is closed
  }
}

function initialTextSize(): TextSize {
  const saved = Number(read(A11Y_KEYS.textSize));
  return saved === 1 || saved === 2 ? saved : 0;
}

// No saved choice: follow the system setting (prefers-contrast: more).
function initialContrast(): boolean {
  const saved = read(A11Y_KEYS.contrast);
  if (saved === 'high') return true;
  if (saved === 'normal') return false;
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-contrast: more)').matches
    : false;
}

export function applyA11y(textSize: TextSize, highContrast: boolean): void {
  const html = document.documentElement;
  html.style.fontSize = TEXT_SIZES[textSize].percent;
  html.classList.toggle('high-contrast', highContrast);
  html.dataset.textSize = String(textSize);
}

interface A11yState {
  textSize: TextSize;
  highContrast: boolean;
  setTextSize: (size: TextSize) => void;
  toggleContrast: () => void;
}

export const useA11yStore = create<A11yState>((set, get) => ({
  textSize: initialTextSize(),
  highContrast: initialContrast(),
  setTextSize: (textSize) => {
    write(A11Y_KEYS.textSize, String(textSize));
    applyA11y(textSize, get().highContrast);
    set({ textSize });
  },
  toggleContrast: () => {
    const highContrast = !get().highContrast;
    write(A11Y_KEYS.contrast, highContrast ? 'high' : 'normal');
    applyA11y(get().textSize, highContrast);
    set({ highContrast });
  },
}));
