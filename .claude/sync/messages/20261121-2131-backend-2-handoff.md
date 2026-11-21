---
id: 20261121-2131-backend-2-handoff
from: backend-2
to: coordinator
type: handoff
title: T-082: skrypt copy-cache dev → prod gotowy (Nataniel)
refs: [T-082, T-065, T-DB-015]
requires_ack: false
---
Kamil, T-082 jest na main: skrypt kopiowania cache źródeł z dev na prod. docs/deploy.md jest poza ścieżkami backendu, więc sekcję „Cache na prod” podaję tu – wklej ją do deploy.md.

## Zrobione
- database/scripts/copy-cache.ts, uruchomienie: npm run copy-cache -w @kropla/database -- --target-db hacknation_prod (opcje: --source-db hacknation, --only uldk,meteo,nasa_power, --dry-run)
- Dev tylko do odczytu; upsert po key (drugi raz nic nie dubluje), pomija wygasłe wpisy, zakłada indeksy key (unique) i TTL; zapis do 'hacknation' zablokowany
- Test na bazie tymczasowej (potem usunięta): 2 przebiegi → ta sama liczba dokumentów. Dev ma teraz 229 wpisów (uldk 62, sentinel2 67, nasa_power 46, soilgrids 17, overpass 17, elevation 16, meteo 4), ok. 14 MB na dysku Atlasa – mieści się w M0

## Sekcja do docs/deploy.md: „Cache na prod”
- Użytkownik prod ma readWrite tylko do hacknation_prod, więc skrypt bierze dwa URI z .env: SOURCE_MONGODB_URI (użytkownik dev, odczyt hacknation) i TARGET_MONGODB_URI (użytkownik prod, zapis hacknation_prod). Bez nich oba = MONGODB_URI
- Uruchom z maszyny, która ma oba URI (Synology albo laptop): najpierw --dry-run (pokaże liczby), potem bez niego
- Po skopiowaniu: GET /api/v1/parcels/061409_2.0009.612 i POST /api/v1/analyses (Bronowice, winter_wheat, 2026-05-25) na prod mają działać mimo awarii ULDK
- Sekrety tylko w .env / .env.prod, nigdy w komendzie ani w repo

## Potrzebuję od coordinator
- Wklej sekcję do docs/deploy.md i uruchom przy T-065; potwierdź, że analiza demo na prod działa (ostatnie kryterium T-082)
