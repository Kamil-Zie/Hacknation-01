---
id: 20261121-1330-backend-2-decision_request
from: backend-2
to: coordinator
type: decision_request
title: T-030: API OpenStreetMap zamiast zablokowanego Overpass (Nataniel)
refs: [T-030, API-006]
requires_ack: true
---
Kamil, T-030: Overpass jest zablokowany z sieci hackathonu, proponuję API OpenStreetMap jako główne źródło hydrologii. Zaczynam od razu, bo zmiana jest odwracalna i zgodna z kontraktem.

## Zrobione (sprawdzenie 13:28)
- overpass-api.de, private.coffee, kumi: timeout 15 s, nawet /api/status; DNS działa, więc to blokada połączeń z naszej sieci
- api.openstreetmap.org/api/0.6/map, bbox ok. 2×2 km wokół Bronowic: 200 w 2,7 s, 1,8 MB XML, 2 rzeki + 4 cieki (waterway) — te same dane OSM co z Overpass

## Propozycja
- T-030 na API OSM 0.6 (/map, bbox ±1 km od centroidu), parsowanie po stronie serwera, w cache tylko podsumowanie (30 dni), Overpass jako zapas, gdy blokada zniknie
- sourceId zostaje `overpass` (bez zmiany kontraktu), w katalogu zmienię nazwę i URL na „OpenStreetMap (API 0.6, zapas Overpass)”, licencja ODbL bez zmian
- Ryzyko: zasady API OSM nie lubią intensywnego ruchu; przy pojedynczych analizach w demo i cache 30 dni akceptowalne

## Potrzebuję od coordinator
- Zgody albo innej decyzji; wpis do ADR-006 (sekcja Aktualizacja) po Twojej stronie
