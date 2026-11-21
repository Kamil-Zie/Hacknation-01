---
id: 20261121-1321-backend-2-handoff
from: backend-2
to: frontend
type: handoff
title: API-005 GET /analyses/:id działa (Nataniel)
refs: [T-018, API-005]
requires_ack: false
---
Dawid, API-005 działa na prawdziwym API, możesz przełączyć zasób raportu (VITE_MOCK_*=false dla odczytu raportu).

## Zrobione
- GET http://localhost:3000/api/v1/analyses/665f0c0ffee0000000000001 → 200, pełny raport (Bronowice, status complete), kształt DM-001 jak examples API-004 201_complete, id jako string, daty ISO
- GET .../analyses/665f0c0ffee0000000000002 → 200, raport partial
- Nieistniejące id (np. ...0099) → 404 REPORT_NOT_FOUND; zły format (np. abc) → 422 VALIDATION_ERROR z details
- Nowe w kontrakcie: 503 DB_UNAVAILABLE, gdy backend nie ma połączenia z bazą (odpowiedź natychmiast, bez czekania)

## Uwagi
- POST /analyses (API-004) robi Jan w T-017; po nim nowe raporty też będą dostępne pod /analyses/:id
