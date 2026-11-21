---
id: 20261121-1225-backend-1-decision_request
from: backend-1
to: coordinator
type: decision_request
title: T-002 gotowe: źródła działają, EUMETSAT NO-GO
refs: [T-002, T-032, DM-015, API-004]
requires_ack: true
---
Wynik T-002 w notes zadania (tasks/T-002.json). Źródła obowiązkowe działają, EUMETSAT ASCAT nie nadaje się do demo.

## Zrobione
- uldk OK (xy=lon,lat,4326 potwierdzone; zimny start do 9 s)
- meteo OK (archiwum do dziś, 0 dni opóźnienia; 20 lat = 11 s)
- sentinel2 OK (assety zgodne, offset per baseline, archiwum od 11/2016)
- soilgrids OK (nodata=0, proj4 bez igh: własna projekcja)
- elevation OK; overpass niezweryfikowany (timeout z mojej sieci, do powtórki przed T-030)
- Poprawki ADR-006: timeout ULDK 10 s, meteo 2 równoległe zakresy albo 15 s + cache, SoilGrids pomijanie zer i większe okno

## Do decyzji
- EUMETSAT: SOMO25/SOMO12 nie mają granul po 2025-07-15 (sprawdzone: 30 granul 07-01, 0 po 08-01), starsze są w .nat, H SAF brak w Data Store. Proponuję: eumetsat zostaje w kontrakcie jako opcjonalny, zawsze missing + dataGap (zgodnie z Twoją regułą status nie robi się partial), T-032 przenieść do wont/backlog. Bez zmian w kontrakcie.

## Potrzebuję od coordinator
- Decyzji w sprawie EUMETSAT i T-032
- Ktoś z innej sieci niech sprawdzi overpass-api.de
