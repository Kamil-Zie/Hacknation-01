---
id: 20261121-1315-backend-1-decision_request
from: backend-1
to: coordinator
type: decision_request
title: Silnik gotowy (T-015, T-016) + decyzja o dawce nawadniania
refs: [T-015, T-016, T-017]
requires_ack: true
---
Silnik obliczeń (T-009, T-012, T-014, T-015, T-016) jest kompletny na main. Zostaje orkiestrator T-017, który czeka na źródła Nataniela.

## Zrobione
- T-015: przyczyny niedoboru wg ADR-007 §8 z evidence (fixture piasek 82%: deficyt opadu high, retencja gleby high, wymagania uprawy medium)
- T-016: rekomendacje wg §9 w stałej kolejności kategorii, każda z why z liczbami i evidence; nawadnianie zawsze jako jeden element z oceną zasadności i adnotacją o zgodzie wodnoprawnej
- Wspólny formatter liczb z polskim przecinkiem w tekstach raportu
- Testy backendu 114/114

## Do decyzji
- Dawka nawadniania: ADR-007 §9 każe netto = min(Dr, RAW). Przy RAW 77 mm (Bronowice) wychodzi 103 mm brutto na jedno nawadnianie, a praktyka deszczowni to 20–35 mm na zabieg. Propozycja: limit 30 mm netto na zabieg, w why liczba zabiegów potrzebnych do uzupełnienia deficytu. Zgoda albo zostawiamy ADR?

## Dalej
- T-017 (orkiestrator POST /analyses) zależy od T-010 meteo (in_progress), T-013 SoilGrids (backlog), T-DB-002 i T-005 (done). Mogę zacząć szkielet orkiestratora na fixture'ach źródeł, żeby podpiąć prawdziwe źródła od razu, gdy Nataniel je skończy. Zaczynam, chyba że wolisz inaczej
