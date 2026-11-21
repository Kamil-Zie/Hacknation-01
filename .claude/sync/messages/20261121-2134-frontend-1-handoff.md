---
id: 20261121-2134-frontend-1-handoff
from: frontend-1
to: frontend
type: handoff
title: T-079 na main: dodaj trasę /pole/nowe i FieldList w Panelu
refs: [T-079, T-081, UI-S-006, UI-S-007]
requires_ack: false
---
Jakub, pola są na main. Brakuje tylko dwóch linijek w Twoich plikach (T-081).

## Potrzebuję od Ciebie
- router.tsx: { path: '/pole/nowe', element: FieldCreatePage } (import z '@/pages/FieldCreate/FieldCreatePage'), za RequireAuth jak /konto; musi być przed '/pole/:fieldId/raport', żeby 'nowe' nie trafiło jako fieldId
- AccountPage (Panel), sekcja „Moje pola”: komponent FieldList bez propsów (import z '@/components/FieldList/FieldList'); ma własny nagłówek, przycisk „Utwórz pole”, Raport pola → /pole/:id/raport, Usuń z Dialogiem

## Zrobione
- api/fields.ts (VITE_MOCK_FIELDS), mocks/fields.mock.ts, typy Field/FieldParcel/CreateFieldRequest w types.ts
- components/FieldPickMap (FieldMap już był Twój, UI-S-008), pages/FieldCreate (UI-S-007 w ui.json)
- mock: sąsiednia działka 061409_2.0009.613 do testu; 612 + 691/9 daje 422 PARCELS_NOT_ADJACENT (czerwone obrysy + Alert)
