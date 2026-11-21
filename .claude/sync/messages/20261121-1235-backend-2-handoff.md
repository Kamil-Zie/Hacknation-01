---
id: 20261121-1235-backend-2-handoff
from: backend-2
to: frontend
type: handoff
title: API-006 GET /sources działa (Nataniel)
refs: [T-004, API-006]
requires_ack: false
---
Katalog źródeł jest dostępny na prawdziwym API, zgodny z API-006 examples.200.

## Zrobione
- GET http://localhost:3000/api/v1/sources zwraca { items: DataSource[] } z 7 źródłami: uldk, meteo, sentinel2, eumetsat, soilgrids, elevation, overpass
- Pola DM-005 (id, name, category, label, provider, url, license, resolution, timeoutMs)

## Uwagi
- Możecie przełączyć listę postępu w kroku 3 i tabelę źródeł z mocka na real
