// UI-S-001 Zustand store: currently selected parcel and whether it came from the example button (client state only)
import { create } from 'zustand';

import type { Parcel } from '@/api/types';

interface SelectionState {
  parcel: Parcel | null;
  isExample: boolean;
  setParcel: (parcel: Parcel | null) => void;
  setIsExample: (isExample: boolean) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  parcel: null,
  isExample: false,
  setParcel: (parcel) => set({ parcel }),
  setIsExample: (isExample) => set({ isExample }),
}));
