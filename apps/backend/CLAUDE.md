# Backend: kontekst dla agentów (wczytywany tylko przy pracy w apps/backend)

Nie eksploruj całego repo. Masz: brief teamu i mapę kodu z początku sesji (`node .claude/scripts/brief.mjs`, `node .claude/scripts/project-map.mjs --team backend`), kontrakty `contracts/api.json` i `contracts/data_model.json` (czytaj tylko elementy z zadania, np. `grep -n "API-004" contracts/api.json`) oraz sekcje 1, 3 i 4 `docs/coding-standard.md`.

## Gdzie co dodać (endpoint API-NNN, zawsze w tej kolejności)

| Krok | Plik | Wzór do skopiowania |
|---|---|---|
| 1. Schemat wejścia/wyjścia | `src/validation/<resource>.schema.ts` (Zod, typy z `z.infer`) | istniejący schemat |
| 2. Model (DM-NNN) | `src/models/<Resource>.model.ts` + zadanie T-DB | istniejący model |
| 3. Logika | `src/services/<resource>.service.ts` (mapowanie dokumentu na DTO) | istniejący service |
| 4. Kontroler | `src/controllers/<resource>.controller.ts` (`asyncHandler`) | istniejący kontroler |
| 5. Trasa | `src/routes/<resource>.routes.ts` + podpięcie w `src/app.ts` | istniejąca trasa |

Błędy tylko przez `throw new AppError(code, message, status)`; kody z `contracts/api.json`. Listy zawsze `{ items, page, pageSize, total }`. Każdy plik zaczyna się komentarzem z ID kontraktu (`// API-002 GET /items`), z którego powstaje mapa kodu.

## Pułapki

- `process.env` czyta tylko `src/config/env.ts`.
- Zmiana modelu lub seeda: zadanie T-DB w tym samym commicie, seed na wspólnej bazie dev tylko wykonawca T-DB.
- CORS: `CORS_ORIGIN` z `.env` (dev `http://localhost:5173`).

Lead aktualizuje ten plik w tym samym commicie, w którym zmienia strukturę lub wzorce (maks. 60 linii).
