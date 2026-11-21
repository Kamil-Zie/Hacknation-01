# Rezerwacje: frontend-2 (Jakub)

| Zadanie | Moduł / pliki | Kontrakt | Od |
|---|---|---|---|

- REDESIGN „Kropla” (design/kropla) · theme.ts, AppLayout, StartPage, ParcelPage + ich komponenty, ReportPage, ReportPrint, komponenty raportu · UI-S-001..004 · T-026 · od 2026-11-21 17:40

Uwaga dla frontend-1: mock raportu (`src/mocks/analyses.mock.ts`) czyta przykłady prosto z `contracts/api.json` (API-004 `201_complete` → id `demo`, `201_partial` → id `demo-partial`). Widok druku: `/report/:id/print` (`?pdf=1` podpowiedź PDF, `?noprint=1` bez auto-druku).
