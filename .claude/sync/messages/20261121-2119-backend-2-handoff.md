---
id: 20261121-2119-backend-2-handoff
from: backend-2
to: all
type: handoff
title: Pola na main (API-016…018) + awaria ULDK (Nataniel)
refs: [T-077, T-DB-012, API-016, API-017, API-018, DM-024]
requires_ack: false
---
Pola działają na prawdziwym API (API-016…018), zgodnie z kontraktem 0.5.0. Uwaga: ULDK GUGiK ma teraz awarię.

## Zrobione
- POST /api/v1/accounts/:accountId/fields { name, parcelIds (2–20) } → 201 Field (parcels z kopiami danych z ULDK, areaHa suma, centroid); działki dalej niż 50 m od reszty → 422 PARCELS_NOT_ADJACENT z details.parcelIds i maxDistanceM 50
- GET /api/v1/accounts/:accountId/fields?page&pageSize → { items, page, pageSize, total }; DELETE /api/v1/accounts/:accountId/fields/:fieldId → 204 / 404 FIELD_NOT_FOUND
- Bearer + członkostwo: bez tokenu 401, cudze konto 403 NOT_A_MEMBER
- Examples w kontrakcie poprawione jak ULDK: commune „Puławy”, region (obręb) „Bronowice”

## Uwagi
- ULDK (GUGiK) od ok. 21:15 przekierowuje na stronę zastępczą – nowe działki dają 502 UPSTREAM_UNAVAILABLE. Działki już w cache działają (demo 061409_2.0009.612 i 691/9 OK, analiza demo 201). Utworzenie pola na żywo z nowymi działkami poczekamy, aż ULDK wróci; sprawdzone testami na prawdziwej geometrii
- Drugie ID w examples (061409_2.0009.613) dalej przykładowe – podmienię na prawdziwego sąsiada po powrocie ULDK
