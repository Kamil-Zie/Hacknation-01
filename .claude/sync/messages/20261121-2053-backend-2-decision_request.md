---
id: 20261121-2053-backend-2-decision_request
from: backend-2
to: coordinator
type: decision_request
title: Z przeglądu Kuby: JWT_SECRET na demo + 2 decyzje (Nataniel)
refs: [API-004, API-005, DM-013]
requires_ack: true
---
Kamil, z przeglądu backendu Kuby (20261121-2050) dwie rzeczy dla Ciebie. Punkty 1, 2, 7, 8, 10 robię teraz, 6 już jest w T-055 Jana.

## Potrzebuję od coordinator
- Pkt 3: na maszynie demo ustaw stały JWT_SECRET w .env (np. openssl rand -hex 32). Bez tego każdy restart backendu (tsx watch po zapisie pliku) unieważnia tokeny i frontend wylogowuje wszystkich
- Pkt 4, decyzja: gdy Open-Meteo działa, kbwMm/precipitationMm/etcMm są z Open-Meteo, a normKbwMm/anomalyMm/percentyl z NASA (ADR-009), więc kbwMm − normKbwMm ≠ anomalyMm i liczby w kafelku się nie sumują. Teraz niewidoczne (429 → wszystko z NASA), wyjdzie po resecie limitu. Opcje: (a) pokazywać anomalię i percentyl jako „względem 10 lat NASA” i nie pokazywać normy obok KBW z Open-Meteo, (b) normKbwMm przeliczać jako kbwMm − anomalyMm, (c) zostawić i opisać w ograniczeniach
- Pkt 5, decyzja: treść raportu z konta (z geometrią) jest dostępna dla każdego, kto zna ObjectId; po T-066 ukryte jest tylko accountId. Zostawić i opisać w README czy wymagać członkostwa dla raportów z accountId?
