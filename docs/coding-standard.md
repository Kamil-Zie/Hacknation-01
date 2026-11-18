# Standard kodu HackNation

Jeden schemat dla wszystkich agentów i ludzi. Kod ma wyglądać tak, jakby napisała go jedna osoba. Przed pierwszą zmianą w `apps/` albo `database/` przeczytaj ten plik.

Dotyczy domyślnego stacku (`technologies.recommended_default`): React + TypeScript + Vite + MUI, Node + TypeScript + Express + Zod, MongoDB + Mongoose, npm workspaces. Jeśli koordynator wybierze inny stack, `coord-architect` aktualizuje ten plik w tym samym commicie co decyzję.

Formatowanie robi Prettier (`.prettierrc.json`), edytor trzyma `.editorconfig`. Nie formatuj ręcznie i nie zmieniaj formatowania plików, których nie dotyczy zadanie.

---

## 1. Zasady wspólne

| Co | Zasada |
|---|---|
| Język kodu | Angielski: nazwy, komentarze, commity. Teksty w UI po polsku. |
| TypeScript | `strict: true`. Bez `any` (użyj `unknown` i zawężenia). Bez `// @ts-ignore`; wyjątek tylko z `// @ts-expect-error <powód>`. |
| Eksporty | Tylko nazwane (`export function`, `export const`). Domyślny eksport tylko tam, gdzie wymaga go narzędzie (np. `vite.config.ts`). |
| Funkcje | `function` dla komponentów i funkcji modułu, strzałki dla callbacków. Jedna odpowiedzialność, maks. ok. 50 linii. |
| Asynchroniczność | `async`/`await`, bez `.then()` w łańcuchach. Każdy `await` na granicy (API, baza) ma obsłużony błąd. |
| Wartości stałe | Na górze pliku albo w `constants.ts`, nie „magiczne” liczby i stringi w środku logiki. |
| Typy danych z kontraktu | Jedno źródło: typy w `api/types.ts` (frontend) i `validation/*.schema.ts` (backend, typy z `z.infer`). Nie przepisuj ich w kilku miejscach. |
| Odwołania do kontraktu | Plik, który realizuje element kontraktu, zaczyna się komentarzem z jego ID: `// API-002 GET /items`, `// UI-S-001 Lista zgłoszeń`, `// DM-001 Item`. |
| TODO | Tylko `// TODO(T-004): opis`, zawsze z ID zadania. |
| Logi | Frontend: bez `console.log` w commitach. Backend: `logger` z `utils/logger.ts` (`info`, `warn`, `error`), bez `console.log`. |
| Zależności | Tylko z `technologies.*.choice`. Nowa biblioteka: `decision_request` (wyjątek: drobna i lokalna, wpis w notatkach zadania). |

### Nazewnictwo

| Element | Styl | Przykład |
|---|---|---|
| Zmienne, funkcje | camelCase | `fetchItems`, `itemCount` |
| Boolean | prefiks `is`/`has`/`can`/`should` | `isLoading`, `hasError` |
| Komponenty React, klasy, typy, interfejsy | PascalCase | `ItemList`, `AppError`, `ItemDto` |
| Typy propsów | `<Komponent>Props` | `ItemListProps` |
| Hooki | `use` + PascalCase | `useItemsQuery` |
| Stałe modułu | UPPER_SNAKE_CASE | `PAGE_SIZE` |
| Zmienne środowiskowe | UPPER_SNAKE_CASE, frontend z prefiksem `VITE_` | `MONGODB_URI`, `VITE_API_URL` |
| Pola JSON w API i w bazie | camelCase | `createdAt`, `ownerId` |
| Ścieżki API | `/api/v1/` + rzeczownik w liczbie mnogiej, kebab-case | `/api/v1/support-tickets/:id` |
| Foldery | kebab-case (poza folderami komponentów) | `support-tickets/` |
| Pliki komponentów | PascalCase, folder o tej samej nazwie | `components/ItemList/ItemList.tsx` |
| Pozostałe pliki | camelCase z sufiksem roli | `items.routes.ts`, `items.service.ts`, `useItemsQuery.ts` |
| Testy | obok pliku, sufiks `.test.ts(x)` | `items.service.test.ts` |

### Kolejność importów

Cztery grupy oddzielone pustą linią: 1) moduły Node (`node:fs`), 2) pakiety zewnętrzne, 3) aliasy projektu (`@/…`), 4) ścieżki względne (`./`, `../`). Alias `@/` wskazuje na `src/` w każdej aplikacji. Bez importów `../../../`: wtedy użyj aliasu.

---

## 2. Frontend (`apps/frontend`)

```
apps/frontend/src/
  main.tsx                  start aplikacji
  app/
    App.tsx                 providers: Theme, QueryClient, Router
    router.tsx              wszystkie trasy w jednym miejscu
    theme.ts                motyw MUI z contracts/ui.json → design_tokens (jedyne źródło kolorów, fontów, breakpointów)
  pages/<PageName>/
    <PageName>.tsx          jeden ekran = jeden UI-S-NNN
  components/<ComponentName>/
    <ComponentName>.tsx     jeden komponent = jeden UI-C-NNN (wspólne komponenty)
  api/
    client.ts               fetch + baza URL z VITE_API_URL, wspólna obsługa błędów
    types.ts                typy z contracts/api.json
    <resource>.ts           funkcje wywołań i hooki TanStack Query, np. useItemsQuery
  mocks/
    <resource>.mock.ts      dane i handlery mocka o kształcie z kontraktu; włączane VITE_USE_MOCKS=true
  store/                    Zustand, tylko stan klienta (np. filtr, UI); dane z API nigdy tutaj
  hooks/                    hooki ogólne (nie dotyczące jednego zasobu)
  utils/                    czyste funkcje pomocnicze
```

**Wzór ekranu** (każdy ekran obsługuje cztery stany w tej kolejności):

```tsx
// UI-S-001 Lista elementów
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material';

import { useItemsQuery } from '@/api/items';
import { ItemList } from '@/components/ItemList/ItemList';

export function ItemsPage() {
  const { data, isLoading, isError, refetch } = useItemsQuery();

  if (isLoading) return <CircularProgress aria-label="Ładowanie" />;
  if (isError) {
    return (
      <Alert severity="error" role="alert" action={<Button onClick={() => refetch()}>Spróbuj ponownie</Button>}>
        Nie udało się pobrać listy.
      </Alert>
    );
  }
  if (!data?.items.length) return <Typography>Brak elementów.</Typography>;

  return (
    <Stack spacing={{ xs: 2, md: 3 }}>
      <ItemList items={data.items} />
    </Stack>
  );
}
```

- Style: tylko komponenty MUI, `sx` i motyw. Kolory, odstępy i breakpointy z motywu (`theme.palette.*`, `theme.spacing`, `{ xs, md, lg }`), nigdy wpisane na sztywno hexy ani piksele kontenerów.
- Responsywność według `contracts/ui.json → responsive` (mobile-first). Wygląd według artboardów Claude Design.
- Dane z API wyłącznie przez hooki z `api/` (TanStack Query). Klucze zapytań jako stałe w pliku zasobu: `const ITEMS_KEY = ['items'] as const`.
- Formularze: React Hook Form + Zod, schemat obok formularza (`<Form>.schema.ts`).
- Komponent przyjmuje dane przez propsy i nie woła API sam; API woła strona albo hook.

---

## 3. Backend (`apps/backend`)

```
apps/backend/src/
  server.ts                 tylko start serwera (listen)
  app.ts                    express(): cors, json, routes, errorHandler
  config/env.ts             odczyt i walidacja zmiennych środowiskowych (Zod); jedyne miejsce z process.env
  routes/<resource>.routes.ts           ścieżki i middleware, bez logiki
  controllers/<resource>.controller.ts  req → walidacja → service → res
  services/<resource>.service.ts        logika biznesowa, bez req/res
  models/<Resource>.model.ts            schemat Mongoose (DM-NNN)
  validation/<resource>.schema.ts       schematy Zod wejścia i wyjścia + typy z z.infer
  middleware/
    errorHandler.ts          jedyne miejsce, które zamienia błąd na odpowiedź HTTP
    validate.ts              walidacja body/query/params schematem Zod
    auth.ts                  tylko jeśli demo wymaga logowania
  utils/
    AppError.ts              klasa błędu (code, message, status, details)
    asyncHandler.ts          opakowanie async kontrolerów
    logger.ts
```

Przepływ zawsze ten sam: **route → validate → controller → service → model**. Warstwa wyżej nie przeskakuje warstwy niżej (route nie woła modelu, controller nie pisze zapytań do bazy).

**Format błędu** (zgodny z `documentation.conventions.api.error_format`):

```json
{ "code": "VALIDATION_ERROR", "message": "Pole title jest wymagane", "details": { "field": "title" } }
```

- Błędy rzuca się jako `throw new AppError('ITEM_NOT_FOUND', 'Nie znaleziono elementu', 404)`; `errorHandler` zamienia je na odpowiedź. Kontrolery nie wysyłają błędów same.
- Kody błędów UPPER_SNAKE_CASE i tylko te z `contracts/api.json`.
- Lista z paginacją zawsze w kształcie `{ items, page, pageSize, total }`.
- Odpowiedź ma dokładnie pola z kontraktu: mapuj dokument Mongoose na DTO w service (`_id` → `id`, bez `__v`).

**Wzór endpointu:**

```ts
// API-002 GET /items
export const listItems = asyncHandler(async (req, res) => {
  const query = listItemsQuerySchema.parse(req.query);
  const result = await itemsService.list(query);
  res.json(result);
});
```

---

## 4. Baza (`database/` i modele)

- Jeden model = jeden plik `models/<Resource>.model.ts` = jedna encja `DM-NNN`. Nazwa eksportu `<Resource>Model`, kolekcja w liczbie mnogiej.
- Zawsze `{ timestamps: true }`, pola zgodne z `contracts/data_model.json`, indeksy z kontraktu.
- Seed: `database/seed.ts`, idempotentny (czyści i wstawia od nowa), realistyczne dane demo po polsku, odmawia uruchomienia, gdy nazwa bazy to `hacknation_prod` bez flagi `--prod`.
- Każda zmiana tutaj wymaga zadania `T-DB` (hook gita tego pilnuje).

---

## 5. Przed commitem

1. `npm run lint` i `npm run typecheck` w aplikacji, którą zmieniasz (od chwili, gdy istnieje szkielet).
2. Prettier: hook gita sprawdza zmienione pliki, jeśli Prettier jest zainstalowany. Naprawa: `npx prettier --write <pliki>`.
3. Commit w formacie `typ(zakres): opis [T-xxx]`.
