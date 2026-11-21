---
id: 20261121-2224-backend-1-handoff
from: backend-1
to: coordinator
type: handoff
title: Pełny stan backendu: zadania backendu przejmuje Kamil
refs: [T-032, T-067, T-070, T-076, T-077, T-078, T-082, API-004, API-019]
requires_ack: false
---
Kamil, decyzja Jana: od teraz wszystkie zadania backendu przejmujesz Ty. Poniżej pełny stan backendu na 22:25 (main 229095e), żebyś mógł prowadzić go bez pytania nas o kontekst.

## Stan ogólny
- Testy backendu 326/326 (37 plików, Vitest), tsc i ESLint czyste. Wszystkie 19 endpointów API-001…API-019 agreed i zaimplementowane.
- Zadania backendu: wszystkie done poza T-077 i T-082 (Nataniel, status integration) oraz T-032 EUMETSAT (backlog, wont – przepisuję na coord-1). Rezerwacja backend-1 pusta.
- Moje ostatnie zadania: T-067 (backoff ULDK/NASA), T-070 (norma KBW na skali Open-Meteo), T-076 (25 upraw w 8 kategoriach), T-078 (raport zbiorczy pola), T-DB-013, T-DB-014.

## Endpointy (prefix /api/v1)
- Bez logowania: GET /parcels/:parcelId (API-001), GET /parcels/by-point (API-002), GET /crops (API-003, 25 upraw z category), POST /analyses (API-004, auth opcjonalny, z accountId wymaga członkostwa), GET /analyses/:id (API-005, publiczny link, accountId tylko dla członka), GET /sources (API-006).
- Konta (ADR-010): POST /auth/register, POST /auth/login (rememberMe 30 dni / 1 dzień), GET i PATCH /auth/me, członkowie GET/POST/DELETE /accounts/:id/members, GET /accounts/:id/reports, PATCH /accounts/:id.
- Pola (ADR-011): POST/GET/DELETE /accounts/:id/fields (T-077 Nataniel, sąsiedztwo ≤ 50 m z granic ULDK), POST /fields/:fieldId/analyses (T-078, raport zbiorczy).
- Błędy zawsze { code, message, details }; 502 UPSTREAM_UNAVAILABLE ma details.reasonCode, 503 DB_UNAVAILABLE bez bazy, 429 RATE_LIMITED (analizy 10/min, raport pola 4/min, logowanie osobny limit).

## Jak liczy się analiza (API-004)
- Kolejność: walidacja → członkostwo → geometria ULDK (własny limit 20 s, 2 ponowienia 0,6/1,2 s) → źródła równolegle w budżecie 25 s liczonym od otrzymania geometrii (łącznie max 38 s, front czeka 40 s) → silnik → zapis raportu (błąd zapisu nie gubi raportu: nowe id, GET da 404).
- Źródła przez runSource: cache (LRU w pamięci + Mongo source_cache) → fetcher z timeoutem i retry → SourceResult z reasonCode (TIMEOUT, RATE_LIMIT, UPSTREAM_ERROR, CLOUD_COVER, NO_SCENE, PARCEL_TOO_SMALL, NOT_CONFIGURED) i role. Równoległe zapytania o ten sam klucz idą jako jedno (T-078).
- Pogoda (ADR-009): wartości bieżące z Open-Meteo/ERA5 (okno D-90..D), percentyl, anomalia, klasa i podatność z NASA POWER (10 lat, Penman-Monteith). Gdy Open-Meteo daje 429 (częste z sieci hackathonu), NASA POWER jest zapasem i raport nie jest partial. Norma KBW na ERA5 = kbwMm − anomalyMm (T-070), dopisek w limitations.
- Pozostałe źródła: SoilGrids (gleba, Saxton-Rawls, TAW/RAW, SOC przycięte do 4%), ERA5-Land (wilgotność strefy korzeni), Sentinel-2 z Planetary Computer (NDVI/NDMI z maską SCL, plan B bez NDMI → dataGap), elevation (spadek), OSM/Overpass (rowy, cieki), EUMETSAT zawsze missing (NOT_CONFIGURED, nie wpływa na wynik).
- Klasa suszy (ADR-007): severe przy percentylu KBW60 ≤ 10 albo Dr > RAW i percentyl ≤ 30 (tylko ERA5); przy zapasie NASA Dr > RAW daje najwyżej moderate (T-055). moderate przy percentylu ≤ 30 albo Dr > RAW i percentyl ≤ 50. Podatność: sezon z deficytem, gdy min KBW60 < −3·RAW (bez gleby −180 mm); low 0–2, medium 3–5, high ≥ 6. Nawadnianie max 30 mm netto na dawkę. Rekomendacje w kolejności retencja → agrotechnika → nawadnianie.
- Porównanie z IUNG (T-054/T-055, README §9): 12 przypadków, 6/3/3; zostały 3 fałszywe alarmy severe na ERA5 (Głogówek 2023 p14, Środa 2024 p27, Głogówek 2024 p20). Otwarta Twoja decyzja: czy zaostrzenie reguły rozciągnąć na ERA5.

## Raport zbiorczy pola (T-078, API-019)
- Każda działka liczona tą samą analizą (z accountId pola, raporty w historii konta), max 3 naraz, działki niezaczęte w 15 s → failed. Podsumowanie z działek policzonych: najgorsza klasa, % powierzchni severe/moderate, wilgotność i deficyt ważone powierzchnią, najniższa pewność; rekomendacje połączone po ruleId z parcelIds; failed ma errorMessage i parcelNumber. Żadna działka → 502.
- Test na żywo (skrypt, bez zapisu do bazy): 3 działki Bronowice 061409_2.0009.611/612/613, winter_wheat 2026-06-10: 11,9 s na zimno, 7,3 s z cache.

## Ryzyka i otwarte sprawy
- ULDK: od ok. 21:15 najpewniej blokada IP sieci hackathonu przez GUGiK (diagnoza Nataniela 21:59). Nie odpytywać ULDK seriami. W cache dev: Bronowice 612 i 061401_1.0001.691/9; brak 611 i 613, więc Kuba nie utworzy pola 2–3 działek na żywo. Rozgrzanie: 2 zapytania z innego IP (hotspot/VPN) albo po zejściu blokady – obiecałem to Kubie, przechodzi na Ciebie.
- Open-Meteo 429 z sieci hackathonu do resetu limitu (ok. 1:00); raporty idą wtedy na NASA (pewność niższa o 0,05, raport complete).
- Prod/Synology: przy T-065 uruchom npm run copy-cache (T-082, sekcja do docs/deploy.md w wiadomości Nataniela 21:31) i sprawdź analizę Bronowice na prod.
- JWT_SECRET: na maszynach demo stały w .env, inaczej restart serwera wylogowuje wszystkich (prod bez niego nie wstaje).
- Baza: listen dopiero po connectDb (max 8 s); bez Atlasa API wstaje, analizy działają bez zapisu (GET po id da 404), endpointy kont dają 503.
- Zamrożenie 7:00: potem tylko fix/docs/revert.

## Gdzie co jest
- apps/backend/src: routes → controllers → services → models; validation (Zod), middleware (auth, rateLimit, security, errorHandler), config/env.ts (jedyne miejsce z process.env).
- services/analyses.service.ts (orkiestrator API-004), services/analysis/ (sources.ts, assessment.ts), services/engine/ (kbw, soil, water-demand, classify, confidence, vulnerability, causes, recommendations, satellite, crops), services/sources/ (runSource, cache, uldk, meteo, nasaPower, era5land, soilgrids, sentinel2*, elevation, overpass), services/fieldReports.service.ts, services/fields*.
- Metodyka: docs/adr/ADR-006…ADR-011. Testy kontrolne silnika: services/engine/__control__.
- Uruchomienie: npm run dev -w apps/backend (port 3000), testy: npm test -w apps/backend.

## Potrzebuję od coordinator
- Przejmij zadania backendu i decyzje: rozszerzenie reguły severe na ERA5, rozgrzanie cache 611/613 dla demo pól, copy-cache na prod przy T-065.
- T-077 i T-082 są Nataniela (integration) – zdecyduj, czy je przepisać na siebie.
