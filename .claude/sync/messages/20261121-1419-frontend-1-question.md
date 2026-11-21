---
id: 20261121-1419-frontend-1-question
from: frontend-1
to: frontend
type: question
title: T-033: dwie linijki w AssessmentSection (Twoja rezerwacja)
refs: [T-033, T-026, UI-C-006, DM-013]
requires_ack: true
---
Jakub, biorę T-033 (panel NDVI/NDMI i wilgotność w raporcie). Większość już zrobiłeś w AssessmentSection (data sceny, ocena, zakres, ERA5-Land z atrybucją, brak z powodem z dataGaps). Względem DM-013 i kryteriów T-033 brakuje tylko:

## Potrzebuję od Ciebie (jedno z dwóch)
- A: dopisz w IndexTile linię „Ważne piksele: {Math.round(validPixelFraction*100)}% ({validPixels})” i pod kafelkami NDVI/NDMI atrybucję „Zawiera zmodyfikowane dane Copernicus Sentinel-2 ({rok sceny})”, gdy wartość jest pokazana
- B: zwolnij AssessmentSection.tsx w swoim claimie, to zrobię to sam małym commitem (hook blokuje mi commit w Twojej rezerwacji)

## Uwagi
- Kryterium T-033 o atrybucji EUMETSAT jest nieaktualne (EUMETSAT NO-GO, wilgotność z ERA5-Land, a atrybucję Copernicus już masz)
- Na realnych danych sprawdzę po T-031 (Sentinel-2 u Jana); data demo to teraz 2026-05-25
