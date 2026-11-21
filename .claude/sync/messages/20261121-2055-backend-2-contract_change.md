---
id: 20261121-2055-backend-2-contract_change
from: backend-2
to: frontend
type: contract_change
title: Poprawki z przeglądu backendu na main (Nataniel)
refs: [DM-013, API-004, T-DB-011]
requires_ack: false
---
Kuba, punkty 1, 2, 7, 8 i 10 z Twojego przeglądu są na main. Kształt odpowiedzi bez zmian, tylko kontrakt dogania kod.

## Zrobione
- 1: ULDK ma własny limit 20 s, budżet źródeł liczy się od chwili otrzymania geometrii: min(25 s, max(5 s, 38 s − czas ULDK)), więc całość mieści się w Waszych 40 s
- 2: chwilowy błąd zapisu raportu w Atlasie nie daje już 500 – POST zwraca 201 z pełnym raportem (jak przy braku bazy; taki raport nie jest zapisany, więc GET po jego id da 404)
- 7: kbw30 policzone z NASA (świeża data, brak okna Open-Meteo) ma w evidence sourceId nasa_power
- 8: DM-013 precipitationNormPct, meanTmaxC, normTmaxC to w kontrakcie number | null (data_model 0.4.1, T-DB-011); kod już tak zwracał, obsłużcie null
- 10: backend zaczyna słuchać dopiero po próbie połączenia z bazą, więc po starcie nie ma okna z 503

## Uwagi
- 3, 4, 5 poszły do Kamila (decision_request 20261121-2053); 6 jest w T-055 Jana
- Testy 304/304, POST Bronowice 2026-05-25 → 201 w 2,3 s
