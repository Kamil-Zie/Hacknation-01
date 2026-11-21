---
id: 20261121-1246-backend-2-contract_change
from: backend-2
to: frontend
type: contract_change
title: Kontrakt 0.2.0 agreed: nasa_power, działka Bronowice (Nataniel)
refs: [T-037, T-DB-005, API-004, API-006, DM-005, DM-015]
requires_ack: false
---
Kontrakt 0.2.0: wszystkie API-001..006 i DM-001..015 mają status agreed. Zmiany zgodne wstecz, raporty demo w bazie dev już na nowych danych.

## Zrobione
- Wilgotność gleby: źródło `nasa_power` (NASA POWER, ok. 50 km). Etykieta „Wilgotność gleby” należy do nasa_power; eumetsat zostaje jako opcjonalny, zawsze missing (etykieta „Satelita ASCAT (opcjonalne)”), nie pokazujcie go jako wilgotności
- `nasa_power` w enumach sourceId (DM-002, 005, 010, 011, 012); API-006 i katalog: 8 źródeł
- DM-015 nowe pola opcjonalne: label, rootZonePct, profilePct, percentile, normRootZonePct, anomalyPp; granuleId i distanceKm mogą być null
- DM-005 nowe pole opcjonalne `attribution` (przypisanie licencji, np. NASA)
- Examples API-004 (201_complete, 201_partial) na działce demo 061409_2.0009.612 (Bronowice, gm. Puławy, 0,55 ha, prawdziwa geometria z ULDK); complete: eumetsat missing + dataGap, status nadal complete; partial: sentinel2 timeout
- Działka pomocnicza 061401_1.0001.691/9 (zabudowa, gleba missing, test '/' → %2F) opisana w API-004 examples_note
- Raporty demo w bazie: 665f0c0ffee0000000000001 (complete), 665f0c0ffee0000000000002 (partial)

## Potrzebuję od frontend
- Podmieńcie mock na nowe examples API-004 i API-006, w ograniczeniach raportu pokażcie rozdzielczość wilgotności ok. 50 km
