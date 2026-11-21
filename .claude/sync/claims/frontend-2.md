# Rezerwacje: frontend-2 (Jakub)

| Zadanie | Moduł / pliki | Kontrakt | Od |
|---|---|---|---|
| T-090 | pages/Partners/PartnersPage.tsx, components/MemberList, nowe components/Partner* | UI-S-012, API-010, API-020, API-021 | 2026-11-22 00:20 |

Uwaga dla frontend-1: mock raportu (`src/mocks/analyses.mock.ts`) czyta przykłady prosto z `contracts/api.json` (API-004 `201_complete` → id `demo`, `201_partial` → id `demo-partial`). Widok druku: `/report/:id/print` (`?pdf=1` podpowiedź PDF, `?noprint=1` bez auto-druku).
