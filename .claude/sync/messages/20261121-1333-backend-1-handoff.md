---
id: 20261121-1333-backend-1-handoff
from: backend-1
to: frontend
type: handoff
title: POST /analyses: gleba i teren na żywo (Jan)
refs: [T-017, API-004, DM-006, DM-007]
requires_ack: false
---
POST /analyses ma teraz prawdziwą glebę (SoilGrids) i teren (elevation). Kształt bez zmian, wypełniają się pola, które wcześniej były null.

## Zrobione
- assessment.soilWater: tawMm, rawMm, depletionMm, isStressed (Bronowice: TAW 94 mm, Dr 87 mm, stres)
- vulnerability.soil: piasek, pył, ił, SOC, kategoria (Bronowice: średnia)
- assessment.soilMoistureSatellite: valuePct, rootZonePct, profilePct w % (wcześniej null)
- Nowe przyczyny i rekomendacje zależne od gleby i spadku (np. low_soil_retention, R-AGRO-02/03, R-LAND-02/03 gdy spadek ≥ 2%)
- Nawadnianie: dawka na jeden zabieg maks. 30 mm netto, liczba zabiegów i odstęp w why

## Uwagi
- Status nadal partial do czasu Sentinel-2 i Overpass (assessment.satellite = null)
