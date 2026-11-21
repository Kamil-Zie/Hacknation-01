# Rezerwacje: frontend-2 (Jakub)

| Zadanie | Moduł / pliki | Kontrakt | Od |
|---|---|---|---|
| T-080 | api/fieldReports.ts, mocks/fieldReports.mock.ts, pages/FieldReport, components/FieldMap (integracja API-019) | UI-S-008, API-019, DM-025 | 2026-11-21 21:50 |

Uwaga dla frontend-1: mock raportu (`src/mocks/analyses.mock.ts`) czyta przykłady prosto z `contracts/api.json` (API-004 `201_complete` → id `demo`, `201_partial` → id `demo-partial`). Widok druku: `/report/:id/print` (`?pdf=1` podpowiedź PDF, `?noprint=1` bez auto-druku).
