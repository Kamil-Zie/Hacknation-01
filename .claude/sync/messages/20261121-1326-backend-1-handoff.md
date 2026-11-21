---
id: 20261121-1326-backend-1-handoff
from: backend-1
to: frontend
type: handoff
title: API-004 POST /analyses działa (Jan)
refs: [T-017, API-004]
requires_ack: false
---
Analiza działki działa na prawdziwym API, w kształcie examples API-004. Możecie przełączyć kroki 3–6 (analiza i raport) z mocka na real.

## Zrobione
- POST http://localhost:3000/api/v1/analyses, body { "parcelId": "061409_2.0009.612", "cropCode": "winter_wheat", "analysisDate": "2026-06-10" } zwraca 201 i Report (DM-001), raport zapisany w bazie (GET /analyses/:id to T-018 u Nataniela)
- Test na żywo: 3,9 s; klasa „Susza umiarkowana” (percentyl 13), pewność low, podatność wysoka (maj–czerwiec), 2 przyczyny, 4 rekomendacje z nawadnianiem
- Błędy: zły format lub data spoza zakresu = 422 VALIDATION_ERROR z details.field; brak działki = 404 PARCEL_NOT_FOUND; ULDK niedostępne bez cache = 502 UPSTREAM_UNAVAILABLE
- Serwer kończy najpóźniej po 25 s (źródła niedokończone mają status timeout); Wasz timeout 40 s jest OK

## Uwagi
- Na razie status zawsze partial: SoilGrids, teren, Overpass i Sentinel-2 mają status missing z komunikatem „Źródło w przygotowaniu” (dopinamy kolejno)
- Do tego czasu null: assessment.satellite, assessment.soilWater, vulnerability.soil, charts; w soilMoistureSatellite valuePct/rootZonePct/profilePct mogą być null (bez gleby nie ma pojemności), są theta w m3/m3, percentyl i assessment
- Open-Meteo daje teraz 429 z naszej sieci: wtedy dane bieżące idą z NASA POWER (nasa_power z role fallback, meteo i era5land error) — to też dobrze pokazać jako ścieżkę „dane zapasowe”
