// UI-S-001 Zustand store: last picked parcels kept in localStorage (should: "Ostatnie działki")
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Parcel } from '@/api/types';

const MAX_RECENT = 5;

export interface RecentParcel {
  id: string;
  label: string;
}

interface RecentParcelsState {
  items: RecentParcel[];
  add: (parcel: Parcel) => void;
}

export const useRecentParcelsStore = create<RecentParcelsState>()(
  persist(
    (set) => ({
      items: [],
      add: (parcel) =>
        set((state) => ({
          items: [
            {
              id: parcel.id,
              label: `${parcel.parcelNumber}, ${parcel.region} (${parcel.commune})`,
            },
            ...state.items.filter((item) => item.id !== parcel.id),
          ].slice(0, MAX_RECENT),
        })),
    }),
    { name: 'kropla-recent-parcels' },
  ),
);
