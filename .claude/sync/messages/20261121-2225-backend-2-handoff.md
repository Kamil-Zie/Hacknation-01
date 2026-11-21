---
id: 20261121-2225-backend-2-handoff
from: backend-2
to: coordinator
type: handoff
title: Raport backendu Nataniela: przekazanie wszystkich zadań Kamilowi
refs: [T-077, T-082, T-065]
requires_ack: false
---
Kamil, przekazuję Ci całość backendu Nataniela. Moje otwarte zadania (T-077, T-082) są przepisane na coord-1, rezerwacje zwolnione. Stan main 22:05: testy backendu 326/326, typecheck i lint czyste, api.json 0.5.0, data_model.json 0.5.2.

## Zrobione
- Kontrakt i dane: T-003 (examples API-004), T-DB-001…T-DB-011, T-DB-015 (modele Report, SourceCache, User, Account, AccountMember, Field; seed = 2 raporty demo 665f0c0ffee0000000000001/0002, bez czyszczenia kolekcji)
- Źródła: T-004 runSource (cache Mongo + LRU w pamięci T-049, timeout na próbę, reasonCode), T-005 ULDK (+ rozgrzanie przy starcie), T-010/T-037 Open-Meteo D−90…D + ERA5-Land, NASA POWER 10 lat (ADR-009), T-013 SoilGrids, T-029 wysokość/spadek, T-030 hydrologia z API OSM 0.6 (Overpass zablokowany), T-028/T-039 Sentinel-2 z Planetary Computer (~2 s, poprawiony podwójny offset Earth Search: Bronowice 2026-05-25 NDVI 0,35 / NDMI 0,117)
- API: T-011 GET /crops, T-018 GET /analyses/:id, T-040/T-041/T-043 konta (register/login/me, raporty w koncie, historia), T-056 nazwa gospodarstwa (PATCH /accounts/:id), T-075 PATCH /auth/me + rememberMe (30 dni / 1 dzień), T-077 pola (POST/GET/DELETE /accounts/:id/fields, sąsiedztwo ≤ 50 m)
- Bezpieczeństwo i odporność: T-066 (accountId tylko dla członka, nagłówki, limity 10/min analiz i 20/min /auth/* na IP, limit logowań IP+e-mail, body 20 KB, CORS wymagany w prod), 503 DB_UNAVAILABLE bez bazy, poprawki z przeglądu Kuby (osobny budżet ULDK, raport zwracany przy błędzie zapisu, listen po connectDb)
- Weryfikacja: T-036 testy kontrolne silnika + porównanie NASA vs IMGW Lublin (sezon +4–5%), opis w apps/backend/VERIFICATION.md

## Potrzebuję od coordinator
- T-077 (integration): zostało tylko utworzenie pola na żywo z prawdziwą sąsiednią działką i podmiana przykładowego ID 061409_2.0009.613 w examples API-016/017 – czeka na ULDK
- T-082 (integration): przy deployu uruchom npm run copy-cache -w @kropla/database -- --target-db hacknation_prod (najpierw --dry-run; SOURCE_MONGODB_URI = użytkownik dev, TARGET_MONGODB_URI = użytkownik prod), potem sprawdź analizę demo na prod; sekcja do docs/deploy.md w handoffie 20261121-2131
- Prod (T-065): CORS_ORIGIN (inaczej backend nie wystartuje), JWT_SECRET (openssl rand -hex 32), trust proxy działa za Cloudflare (X-Forwarded-For)
- Maszyna demo: stały JWT_SECRET w .env, przed demo jedno otwarcie raportu (rozgrzanie pamięci cache)

## Uwagi
- ULDK od ok. 21:15 odpowiada 302 na integracja01.gugik.gov.pl/resp/uldk.php z fałszywą odpowiedzią – najpewniej blokada IP sieci hackathonu przez GUGiK (szczegóły: 20261121-2159). Demo działa z cache. Nie odpytywać ULDK seriami
- Open-Meteo z sieci hackathonu: 429, analizy idą z zapasu NASA POWER (raport nie jest przez to partial); ścieżka ERA5 działa przez VPN
- Push z Windowsa Nataniela: DNS gita bywa niestabilny (obejście: git -c http.curloptResolve=github.com:443:<IP> push)
- Paczki instalujemy tylko z Linuksa; wszystko w backendzie zrobione bez nowych zależności
- Kopia wycofanego duplikatu DM-025 (zrobił to Jan w 6154654) leży lokalnie na gałęzi backup/backend-2-dm025 u Nataniela, do usunięcia
