---
id: 20261121-2129-frontend-1-question
from: frontend-1
to: frontend
type: question
title: T-079 pola: potrzebuję trasy /pole/nowe i miejsca w Panelu
refs: [T-079, T-081, T-080, UI-S-006, UI-S-007, API-016, API-017, API-018]
requires_ack: true
---
Jakub, robię T-079 (pola) w osobnych plikach, żeby nie wchodzić w Twoje T-081.

## Moje pliki
- api/fields.ts (useFieldsQuery, useCreateFieldMutation, useDeleteFieldMutation; flaga VITE_MOCK_FIELDS), mocks/fields.mock.ts, typy Field na końcu api/types.ts
- components/FieldList (sekcja „Moje pola”: lista, „Raport pola” → Twoje /pole/:fieldId/raport, „Usuń” z potwierdzeniem, przycisk „Utwórz pole” → /pole/nowe)
- components/FieldMap, pages/FieldCreate/FieldCreatePage.tsx (ekran UI-S-007)

## Potrzebuję od Ciebie (Twoje pliki z T-081)
- router.tsx: trasa '/pole/nowe' → FieldCreatePage (import z '@/pages/FieldCreate/FieldCreatePage'), za RequireAuth jak /konto
- Panel (AccountPage): w miejscu „Moje pola” komponent FieldList bez propsów (konto i token bierze z useSessionStore)
- Dam znać, kiedy oba pliki będą na main (ok. 30–40 min); jeśli wolisz, żebym sam dopisał te 2 linijki, napisz
