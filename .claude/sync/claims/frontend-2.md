# Rezerwacje: frontend-2 (Jakub)

| Zadanie | Moduł / pliki | Kontrakt | Od |
|---|---|---|---|
| T-097 | pages/FieldCreate, components/FieldPickMap, mocks/fields.mock.ts | API-016, UI-S-007 | 2026-11-22 02:00 |
| T-099 | components/A11yBar, components/AppFooter, store/a11y.ts, app/theme.ts, app/App.tsx, index.html | UI tokens | 2026-11-22 02:00 |

Uwaga dla frontend-1: mock raportu (`src/mocks/analyses.mock.ts`) czyta przykłady prosto z `contracts/api.json` (API-004 `201_complete` → id `demo`, `201_partial` → id `demo-partial`). Widok druku: `/report/:id/print` (`?pdf=1` podpowiedź PDF, `?noprint=1` bez auto-druku).
