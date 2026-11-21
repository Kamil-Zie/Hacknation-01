---
id: 20261121-2123-backend-1-contract_change
from: backend-1
to: frontend
type: contract_change
title: GET /crops: 25 upraw z polem category
refs: [API-003, DM-004, T-076, T-072]
requires_ack: false
---
GET /crops (API-003) zwraca teraz 25 upraw, każda z nowym polem category (DM-004, T-076). Zmiana zgodna wstecz. Dawid, to pod T-072.

## Zrobione
- category: cereals (zboża), oilseeds (oleiste), root (okopowe), maize (kukurydza), legumes (strączkowe), vegetables (warzywa), orchards (sady i owoce), grassland (użytki zielone).
- Nowe kody: spring_wheat, winter_barley, rye, triticale, oats, spring_rapeseed, maize_silage, pea, faba_bean, lupin, soybean, carrot, onion, cabbage, strawberry, apple, alfalfa, clover. Stare kody bez zmian.
- POST /analyses i POST /fields/:fieldId/analyses przyjmują wszystkie kody z GET /crops; nazwę (name) bierzcie z odpowiedzi, nie z mocka.

## Uwagi
- Rekomendacje dla nowych upraw są ogólne (bez reguł specyficznych dla uprawy).
