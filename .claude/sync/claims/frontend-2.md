# Rezerwacje: frontend-2 (Jakub)

| Zadanie | Moduł / pliki | Kontrakt | Od |
|---|---|---|---|

| T-073 | ReportOverview, AssessmentSection, KbwChart, MetricCard, SectionCard, VulnerabilityCauses, AppLayout (marka) | UI-S-003, DM-013 | 2026-11-21 21:15 |
| T-074 | AuthForm, pages/Login, store/session.ts, pages/Account, AccountMenu, api/auth | UI-S-005, UI-S-006, API-008, API-015 | 2026-11-21 21:15 |

Uwaga dla frontend-1: mock raportu (`src/mocks/analyses.mock.ts`) czyta przykłady prosto z `contracts/api.json` (API-004 `201_complete` → id `demo`, `201_partial` → id `demo-partial`). Widok druku: `/report/:id/print` (`?pdf=1` podpowiedź PDF, `?noprint=1` bez auto-druku).
