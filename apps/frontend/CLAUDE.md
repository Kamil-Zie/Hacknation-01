# Frontend: kontekst dla agentów (wczytywany tylko przy pracy w apps/frontend)

Nie eksploruj całego repo. Masz: brief teamu i mapę kodu z początku sesji (`node .claude/scripts/brief.mjs`, `node .claude/scripts/project-map.mjs --team frontend`), kontrakty `contracts/ui.json` i `contracts/api.json` (czytaj tylko elementy z zadania, np. `grep -n "UI-S-003" contracts/ui.json`) oraz sekcje 1 i 2 `docs/coding-standard.md`.

## Gdzie co dodać

| Potrzebujesz                 | Plik                                                                               | Wzór do skopiowania                     |
| ---------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------- |
| Nowy ekran (UI-S-NNN)        | `src/pages/<Name>/<Name>.tsx` + trasa w `src/app/router.tsx`                       | pierwszy istniejący plik w `src/pages/` |
| Komponent (UI-C-NNN)         | `src/components/<Name>/<Name>.tsx`                                                 | istniejący komponent o podobnej roli    |
| Wywołanie API (API-NNN)      | `src/api/<resource>.ts` (funkcja + hook TanStack Query), typy w `src/api/types.ts` | istniejący plik w `src/api/`            |
| Mock endpointu               | `src/mocks/<resource>.mock.ts` (kształt z `contracts/api.json`)                    | istniejący mock                         |
| Kolory, odstępy, breakpointy | tylko `src/app/theme.ts` (z `contracts/ui.json → design_tokens`)                   | –                                       |

Każdy plik zaczyna się komentarzem z ID kontraktu, np. `// UI-S-001 Lista zgłoszeń`. Z tego komentarza powstaje mapa kodu, więc pisz go zawsze.

## Pułapki

- Zmienne z głównego `.env` widzi Vite tylko z `envDir: '../..'` w `vite.config.ts`.
- Mocki włącza `VITE_USE_MOCKS=true`; przełączenie na prawdziwe API robi `fe-integration` po handoffie.
- Zasób gotowy wcześniej niż reszta przełączaj osobno: `VITE_MOCK_<ZASÓB>=false` nadpisuje `VITE_USE_MOCKS` (np. `VITE_MOCK_PARCELS=false` w `api/parcels.ts`).
- Responsywność 360/768/1280/1920 px i cztery stany ekranu (loading, error, empty, ready) są obowiązkowe.

Lead aktualizuje ten plik w tym samym commicie, w którym zmienia strukturę lub wzorce (maks. 60 linii).
