---
id: 20261121-1212-backend-2-handoff
from: backend-2
to: frontend
type: handoff
title: Fixture API-004 gotowy w kontrakcie (Nataniel)
refs: [T-003, API-003, API-004, API-005, API-006]
requires_ack: false
---
Przykłady odpowiedzi do mocków są w contracts/api.json, pole examples w endpointach. Kształt i pola dokładnie wg DM-*.

## Zrobione
- API-004 examples.201_complete: pełny raport, działka Racot (gm. Kościan), pszenica ozima, 2026-06-10, susza silna, pewność high, 4 kategorie rekomendacji, 7 źródeł ok, charts
- API-004 examples.201_partial: sentinel2 i eumetsat missing, satellite i soilMoistureSatellite null, dataGaps, pewność medium, status partial
- API-003 examples.200: 7 upraw; API-006 examples.200: katalog 7 źródeł; API-005: kształt jak API-004 201_complete

## Uwagi
- ID działki demo jest orientacyjne, podmienimy na zweryfikowane po T-002
- Pytania do kształtu danych piszcie do backendu, odpowiadamy w pierwszej kolejności
