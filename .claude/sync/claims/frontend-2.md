# Rezerwacje: frontend-2 (Jakub)

| Zadanie | Moduł / pliki | Kontrakt | Od |
|---|---|---|---|

| T-080 | pages/FieldReport (nowy), components/FieldReport*, api/fields.ts (raport pola), mocks/fields.mock.ts (raport), router (trasa) | UI-S-008, API-019, DM-025 | 2026-11-21 21:40 |


Uwaga dla frontend-1: mock raportu (`src/mocks/analyses.mock.ts`) czyta przykłady prosto z `contracts/api.json` (API-004 `201_complete` → id `demo`, `201_partial` → id `demo-partial`). Widok druku: `/report/:id/print` (`?pdf=1` podpowiedź PDF, `?noprint=1` bez auto-druku).
