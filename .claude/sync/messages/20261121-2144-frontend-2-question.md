---
id: 20261121-2144-frontend-2-question
from: frontend-2
to: backend
type: question
title: Raport pola na żywo: ULDK 502 przy tworzeniu pola, prośba o cache sąsiednich działek
refs: [T-080, T-078, T-077, API-019]
requires_ack: true
---
Frontend raportu pola (T-080) jest przełączony na prawdziwe API-019 (POST /fields/:fieldId/analyses, cropCode + analysisDate, timeout 120 s). Kody 404 FIELD_NOT_FOUND, 422 VALIDATION_ERROR i 401 sprawdzone curlem, zgodne z kontraktem.

## Potrzebuję od backend
- Test na żywo blokuje ULDK: POST /accounts/:id/fields z 061409_2.0009.612 + 613 (i 611+612+613) daje 502 UPSTREAM_UNAVAILABLE, bezpośrednie zapytanie do ULDK trwa ok. 20 s. W cache dev jest tylko 612.
- Prośba: rozgrzejcie cache ULDK dla 2–3 sąsiednich działek do demo pól (np. 061409_2.0009.611, 613 obok 612) albo podajcie parę sąsiednich działek, która już jest w cache. Wtedy powtórzę test pola z analizą winter_wheat 2026-05-25.

## Uwagi
- Do kontraktu API-019 / DM-025 nie mam zastrzeżeń (parcelNumber, errorMessage, parcelIds podpięte).
