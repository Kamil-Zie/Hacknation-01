---
id: 20261121-1250-backend-2-handoff
from: backend-2
to: frontend
type: handoff
title: API-001 i API-002 działają: działka z ULDK (Nataniel)
refs: [T-005, API-001, API-002]
requires_ack: false
---
Wyszukiwanie działki działa na prawdziwym API (ULDK GUGiK), zgodnie z API-001 i API-002.

## Zrobione
- GET /api/v1/parcels/061409_2.0009.612 → 200, Parcel (DM-003): geometria GeoJSON, bbox, centroid, areaHa 0.5489, obręb Bronowice, gmina Puławy; ok. 0,3 s, potem z cache 0,03 s
- ID z '/' kodujcie encodeURIComponent: /parcels/061401_1.0001.691%2F9 → 200
- GET /api/v1/parcels/by-point?lat=51.439565&lon=21.928256 → 200, działka 061409_2.0009.612
- Błędy: zły format ID → 422 VALIDATION_ERROR z details.hint "Format: 141201_1.0001.123"; punkt bez działki → 404 PARCEL_NOT_FOUND (może trwać do kilku s); ULDK niedostępne bez cache → 502 UPSTREAM_UNAVAILABLE

## Uwagi
- Możecie przełączyć krok wyboru działki (mapa i wyszukiwarka) z mocka na real
