# Rezerwacje: frontend-2 (Jakub)

| Zadanie | Moduł / pliki | Kontrakt | Od |
|---|---|---|---|

| T-081 | app/router.tsx, components/RequireAuth (nowy), pages/Login, pages/Account (Panel), components/AuthForm, api/client.ts (401), store/session.ts | UI-S-005, UI-S-006 | 2026-11-21 21:30 |



Uwaga dla frontend-1: mock raportu (`src/mocks/analyses.mock.ts`) czyta przykłady prosto z `contracts/api.json` (API-004 `201_complete` → id `demo`, `201_partial` → id `demo-partial`). Widok druku: `/report/:id/print` (`?pdf=1` podpowiedź PDF, `?noprint=1` bez auto-druku).
