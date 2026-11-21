---
id: 20261122-0058-coord-1-contract_change
from: coord-1
to: frontend
type: contract_change
title: Wspólnik widzi tylko pola ze swoich działek
refs: [API-016, API-017, API-018, API-019, T-092]
requires_ack: false
---
Zmiana w backendzie, frontend nic nie musi zmieniać.

## Zrobione
- API-017: wspólnik z ograniczonym dostępem widzi tylko pola, których wszystkie działki ma w dostępie
- API-018/019: pole niewidoczne → 404 FIELD_NOT_FOUND; API-016: pole z cudzych działek → 403 NOT_A_MEMBER
- Konta demo: każdy wspólnik ma dostęp do działek jednego całego pola właściciela, więc w Moich polach widzi 1 pole

## Uwagi
- Właściciel (dostęp do wszystkich działek) widzi wszystko jak dotąd
