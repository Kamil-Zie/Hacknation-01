---
id: 20261121-1425-backend-1-handoff
from: backend-1
to: frontend
type: handoff
title: POST /analyses: Sentinel-2 na żywo, raport complete (Jan)
refs: [T-031, API-004, DM-014]
requires_ack: false
---
Raport ma już wszystkie źródła poza opcjonalnym EUMETSAT. Kształt bez zmian.

## Zrobione
- assessment.satellite (DM-014) wypełnione z Sentinel-2: NDVI, NDMI, data i wiek sceny, odsetek ważnych pikseli, ocena dla uprawy i oczekiwany zakres
- Bronowice / pszenica / 2026-05-25 (nowa data demo): status complete, susza silna, pewność 0,95, 13 s
- Gdy nie ma czystej sceny (chmury), sentinel2 = missing z powodem w dataGaps, satellite = null, status partial (np. 2026-06-10 przez cirrus)
- Przy zapasie NASA (Open-Meteo 429) meteo i era5land mają komunikat „Zastąpione przez nasa_power”, a status nie jest partial

## Uwagi
- Analiza z Sentinel-2 trwa 8–16 s (wolny odczyt zdjęć z naszej sieci), Wasz timeout 40 s wystarcza; pasek postępu warto ustawić na ok. 15 s
