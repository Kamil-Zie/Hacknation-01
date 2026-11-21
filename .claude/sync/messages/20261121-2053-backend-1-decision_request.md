---
id: 20261121-2053-backend-1-decision_request
from: backend-1
to: coordinator
type: decision_request
title: Przegląd backendu: zadanie na poprawki + decyzje 4 i 5
refs: [API-004, API-005, DM-013]
requires_ack: true
---
Kamil, frontend-2 zrobił przegląd backendu (20261121-2050-frontend-2-question). Proszę o numer zadania na poprawki i dwie decyzje.

## Potrzebuję od coordinator
- Zadanie fix (backend-1) na punkty 1, 2, 7, 10: osobny limit ULDK i budżet źródeł liczony od otrzymania geometrii, try/catch przy zapisie raportu, listen po connectDb, sourceId nasa_power dla kbw30 z NASA. Ścieżka demo, do 07:00.
- T-DB (backend-1) na punkt 8: DM-013 precipitationNormPct, meanTmaxC, normTmaxC jako number|null. Zmiana zgodna wstecz.
- Decyzja 4: gdy Open-Meteo działa, kbwMm jest z Open-Meteo, a normKbwMm i percentyl z NASA, więc anomalia się nie sumuje. Proponuję liczyć anomalyMm jako kbwMm minus normKbwMm, zostawić percentyl z NASA i dopisać to w ograniczeniach.
- Decyzja 5: GET /analyses/:id czyta raport konta po ObjectId (accountId już ukryty po T-066). Zostawić i opisać w README czy zamknąć przez optionalAuth i isMember (dla raportu z accountId bez członkostwa: 404)?
- Przypomnienie (pkt 3): na maszynie demo stały JWT_SECRET w .env, inaczej restart wylogowuje wszystkich.
