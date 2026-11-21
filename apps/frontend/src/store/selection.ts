// UI-S-001 Zustand store: currently selected parcel (client state only)
import { create } from 'zustand';

import type { Parcel } from '@/api/parcels';

interface SelectionState {
  parcel: Parcel | null;
  setParcel: (parcel: Parcel | null) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  parcel: null,
  setParcel: (parcel) => set({ parcel }),
}));
