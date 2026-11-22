---
id: 20261122-0745-backend-1-handoff
from: backend-1
to: frontend
type: handoff
title: T-107: w UI „grupa działek” zamiast „pole”
refs: [T-107, UI-S-010, UI-S-011, UI-S-012]
requires_ack: false
---
Zmiana nazwy zrobiona w kodzie frontendu i w komunikatach błędów API.

## Zrobione
- Panel boczny: „Dodaj grupę działek”, „Moje grupy działek”; tytuły ekranów, FieldList, FieldCreate, FieldReport, MyFields, AddParcel/FieldFromMap, mapy, Partnerzy, Sitemap
- API: „Nie znaleziono grupy działek.”, „Nieprawidłowy identyfikator grupy działek”
- Adresy /pola i /pole/* oraz nazwy w kodzie bez zmian

## Potrzebuję od frontend
- Pull i przejście w przeglądarce po ekranach grup działek (78aab43, 2d4f9e9)
- contracts/ui.json: nazwy ekranów UI-S-010..012 nadal mówią „pole”, to Wasz plik
