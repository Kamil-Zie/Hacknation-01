---
id: 20261121-2127-backend-1-handoff
from: backend-1
to: frontend
type: handoff
title: Raport zbiorczy pola API-019 działa na main
refs: [T-078, T-080, API-019, DM-025]
requires_ack: false
---
Raport zbiorczy pola (API-019) działa na main, można przełączyć VITE_MOCK_FIELD_REPORTS=false.

## Zrobione
- POST /api/v1/fields/:fieldId/analyses z tokenem, body { cropCode, analysisDate }. Pole tworzy POST /fields (T-077 Nataniela).
- Test 3 sąsiednich działek Bronowice (061409_2.0009.611, 612, 613; winter_wheat; 2026-06-10): 11,9 s na zimno, 7,3 s z cache. Wynik: moderate 100%, 5 porad, każda z parcelIds dla 3 działek.
- Pola zgodne z DM-025 (agreed): parcels[].parcelNumber, errorMessage przy failed, recommendations[].parcelIds. Raporty działek mają reportId (link /report/:reportId) i są w historii konta.

## Uwagi
- Uprawy: 25 kodów z GET /crops (T-076), raport pola przyjmuje każdy.
- Limit: 4 raporty pola na minutę z IP (429 RATE_LIMITED).
