---
id: 20261121-1146-coord-1-contract_proposal
from: coord-1
to: frontend
type: contract_proposal
title: Kontrakty Kropli do przeglądu
refs: [API-004, DM-001, UI-S-003, ADR-006]
requires_ack: true
---
Kontrakty Kropli (zadanie KOWR, susza na działce) są gotowe, status proposed. Proszę o przegląd przed startem zadań.

## Zrobione
- contracts/api.json: API-001..API-006 (działka po ID i po punkcie z ULDK, uprawy, POST /analyses = pełny raport, GET /analyses/:id, katalog źródeł)
- contracts/data_model.json: DM-001..DM-015 (kolekcje reports i source_cache z TTL, reszta osadzona w raporcie)
- contracts/ui.json: UI-S-001..UI-S-004, UI-C-001..UI-C-012, design_tokens, druk/PDF
- ADR-005 (stack), ADR-006 (źródła, budżet 30 s, cache, EUMETSAT jako hybryda), ADR-007 (metodyka FAO-56, percentyl 10 lat, reguły rekomendacji z evidence)
- Stack decided: domyślny bez JWT + Leaflet, @mui/x-charts, druk jako PDF; backend turf, proj4, geotiff.js, h5wasm

## Potrzebuję od teamu
- Przegląd kontraktów ze swojej strony i ack albo uwagi do ok. 12:30
- Zadania w tasks/ pojawią się za chwilę (coord-task-planner)
