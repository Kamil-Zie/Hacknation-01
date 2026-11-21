// UI-C-018 Zustand store: parcel search history (last 10, newest first) kept in localStorage 'kropelka-search-history' [T-087]
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_HISTORY = 10;

export interface SearchHistoryItem {
  id: string;
  label: string;
}

interface SearchHistoryState {
  items: SearchHistoryItem[];
  add: (item: SearchHistoryItem) => void;
  remove: (id: string) => void;
}

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((state) => ({
          items: [item, ...state.items.filter((existing) => existing.id !== item.id)].slice(
            0,
            MAX_HISTORY,
          ),
        })),
      remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
    }),
    { name: 'kropelka-search-history' },
  ),
);
