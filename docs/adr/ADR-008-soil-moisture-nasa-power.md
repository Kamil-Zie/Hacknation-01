# ADR-008: Wilgotność gleby z NASA POWER (zamiast EUMETSAT) i zapas dla meteo

- Status: accepted
- Data: 2026-11-21
- Autor: coord-1
- Powiązane: ADR-006 (aktualizacja po T-002), ADR-007 §5a, DM-015, API-004, T-032 (wont), T-037

## Kontekst

- Wilgotność gleby jest obowiązkowym elementem oceny stanu wilgotności (decyzja zespołu). EUMETSAT ASCAT odpada (T-002: brak granul po 2025-07-15, format `.nat`).
- 2026-11-21 12:40 Open-Meteo zwróciło z sieci zespołu HTTP 429 „Daily API request limit exceeded”. Darmowy limit to 10 000 wywołań na dzień na IP, a długie zakresy i wiele zmiennych liczą się jako wiele wywołań. Sieć hackathonu prawdopodobnie ma jedno IP dla wszystkich. To ryzyko dla meteo w demo i u jury.

## Sprawdzone na żywo (12:41)

`GET https://power.larc.nasa.gov/api/temporal/daily/point?parameters=GWETTOP,GWETROOT,GWETPROF,PRECTOTCORR,T2M,T2M_MAX,EVPTRNS&community=AG&longitude=21.93&latitude=51.44&start=20161101&end=20261120&format=JSON`

- HTTP 200, **1,9 s dla 10 lat** (3672 dni, 7 parametrów), bez klucza i konta.
- Ostatni ważny dzień: D−2 (brak danych = `-999`, traktować jako null).
- Źródło: MERRA-2 / GEOS-IT (reanaliza NASA GMAO z asymilacją obserwacji, także satelitarnych). Siatka ok. 0,5° × 0,625° (ok. 50 km).

## Decyzja

1. Nowe źródło `nasa_power` (kategoria: gleba/meteo, reanaliza satelitarno-modelowa). Plik `services/sources/nasaPower.source.ts`, ten sam wzorzec co pozostałe (timeout 10 s, cache w `source_cache`: dni < D−7 TTL 365 dni, świeższe 6 h).
2. **Wilgotność gleby (DM-015)** liczona z NASA POWER:
   - `GWETTOP` (warstwa 0–5 cm), `GWETROOT` (strefa korzeniowa, ok. 0–100 cm), `GWETPROF` (cały profil); jednostka: wilgotność względna 0–1 (0 = sucho, 1 = nasycenie), w raporcie jako %.
   - Wartość na datę analizy = średnia z 7 dni do D (lub ostatni ważny dzień ≤ D; gdy D jest dziś lub wczoraj, bierzemy D−2 i podajemy datę obserwacji).
   - **Percentyl względem tego samego okna ±15 dni z 10 poprzednich lat** (jak KBW w ADR-007), anomalia w punktach procentowych.
   - Ocena: `dry` przy percentylu ≤ 20 lub GWETROOT ≤ 0,30; `wet` przy percentylu ≥ 80 lub GWETROOT ≥ 0,70; inaczej `normal`.
   - Rola w ocenie (ADR-007 §5a bez zmian co do logiki): potwierdza albo przeczy klasie z KBW i NDMI, wpływa na pewność (waga 0,10 przejęta od eumetsat). Nie zmienia klasy samodzielnie.
3. **Zapas dla meteo:** gdy Open-Meteo zwróci 429, 5xx albo timeout, `meteo` korzysta z NASA POWER (`PRECTOTCORR` opad mm/d, `T2M`, `T2M_MAX`, `T2M_MIN`; ET0 metodą Hargreaves-Samani FAO-56 równ. 52 z Tmax, Tmin i promieniowania pozaziemskiego Ra liczonego z szerokości geograficznej i dnia roku). Raport podaje, które źródło policzyło bilans, a ograniczenia mówią o metodzie Hargreavesa i siatce ok. 50 km.
4. **Oszczędzanie limitu Open-Meteo:** jedno zapytanie na analizę (wszystkie zmienne w jednym wywołaniu), cache po komórce 0,1° i zakresie dat, zero zapytań z testów automatycznych (fixtures), rozgrzanie cache działek demo w T-035.
5. `eumetsat` zostaje w enumie `sourceId` jako opcjonalny, zawsze `missing` (zgodność wstecz), ale nie jest pokazywany jako „wilgotność gleby” w UI: tę etykietę dostaje `nasa_power`.

## Licencja

NASA POWER: dane NASA bezpłatne i otwarte, bez ograniczeń użycia; wymagane przypisanie: „These data were obtained from the NASA Langley Research Center (LaRC) POWER Project funded through the NASA Earth Science/Applied Science Program.” (wpis do README pkt 7 i do katalogu źródeł API-006).

## Konsekwencje

- Wilgotność gleby jest w każdym raporcie dla dowolnej działki w Polsce i dowolnej daty z 10 lat (do D−2), w ≤ 2–3 s.
- Ograniczenie: rozdzielczość ok. 50 km, więc wartość opisuje region, nie samą działkę. Raport mówi to wprost, a lokalność dają gleba (SoilGrids 250 m) i Sentinel-2 (10–20 m).
- Meteo przestaje zależeć od jednego dostawcy z limitem na IP.
