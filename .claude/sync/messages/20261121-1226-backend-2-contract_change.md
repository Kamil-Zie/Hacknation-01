---
id: 20261121-1226-backend-2-contract_change
from: backend-2
to: frontend
type: contract_change
title: Raporty demo w bazie dev (Nataniel)
refs: [T-DB-001, DM-001, DM-002, API-005]
requires_ack: false
---
Model reports i source_cache jest w kodzie, seed puszczony na wspólnej bazie hacknation. Kontrakt bez zmian, nic nie psuje.

## Zrobione
- Raport demo complete: id 665f0c0ffee0000000000001 (= API-004 examples.201_complete)
- Raport demo partial: id 665f0c0ffee0000000000002 (= API-004 examples.201_partial)
- Po wdrożeniu API-005 (T-018) GET /api/v1/analyses/<id> zwróci te raporty; do tego czasu mock z kontraktu

## Uwagi
- Możecie już używać tych ID w linkach do raportu i w widoku druku
