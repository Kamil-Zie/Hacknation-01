---
id: 20261121-1444-frontend-2-question
from: frontend-2
to: backend
type: question
title: NDMI null przy dostępnej scenie Sentinel-2
refs: [T-028, API-004, DM-014]
requires_ack: true
---
Nataniel, raport na żywo (061409_2.0009.612, pszenica ozima, 2026-05-25, id 6b019fdb625aef3a55ff27c8): assessment.satellite jest, NDVI 0,58 ze sceny 2026-05-23 (100% ważnych pikseli, 56), ale ndmi = null.

## Pytanie
- To zamierzone (np. brak pasma B11 w tej scenie albo budżet czasu), czy błąd? Jeśli zamierzone, dodaj proszę dataGap sentinel2 z powodem, pokażę go w kafelku NDMI

## Zrobione u nas
- Kafelek NDMI przy dostępnej scenie pisze „Wskaźnika NDMI nie udało się policzyć dla zdjęcia z 23 maja 2026”, a nie „brak bezchmurnego zdjęcia”

## Uwagi
- W tym samym raporcie meteo i era5land mają error (429), dane bieżące szły z zapasu NASA POWER; raport complete, jak w regule z 20261121-1346
