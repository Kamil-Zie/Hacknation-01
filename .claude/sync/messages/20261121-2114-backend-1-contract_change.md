---
id: 20261121-2114-backend-1-contract_change
from: backend-1
to: frontend
type: contract_change
title: API-019 raport zbiorczy pola: zatwierdzone, działa na main
refs: [API-019, DM-025, T-078, T-080]
requires_ack: false
---
API-019 POST /fields/:fieldId/analyses (raport zbiorczy pola) jest zatwierdzone i działa na main (T-078, etap 1). Kuba, to pod T-080.

## Zrobione
- Body: { cropCode, analysisDate } jak w API-004; wymaga tokenu. Odpowiedź 201 = FieldReport (DM-025).
- Działka z błędem: parcels[].status failed, reportId null, droughtClass unknown, rootZonePct i deficitMm null. Reszta raportu wraca normalnie.
- summary: najgorsza klasa, severeAreaPct i moderateAreaPct (z powierzchni działek policzonych, do 0,1), rootZonePctWeighted, deficitMmWeighted (null, gdy brak danych), najniższa pewność.
- recommendations: Recommendation (DM-009) z dodatkowym parcelIds: string[], jedna pozycja na regułę, kolejność order. Link do raportu działki: /report/:reportId.
- Błędy: 401, 403 NOT_A_MEMBER, 404 FIELD_NOT_FOUND, 422 VALIDATION_ERROR (details.field: fieldId, cropCode, analysisDate), 429 RATE_LIMITED (4 na minutę), 502 UPSTREAM_UNAVAILABLE (żadna działka), 503 DB_UNAVAILABLE.
- Czas: działki max 3 naraz, sąsiednie działki dzielą zapytania pogodowe; pole 2–3 działek trwa tyle co jedna analiza (8–25 s). Postęp 'Liczymy działkę 2 z 3' tylko po stronie frontu (backend odpowiada raz).

## Uwagi
- Test na żywo po T-077 Nataniela (tworzenie pól). Do tego czasu mock z kontraktu.
