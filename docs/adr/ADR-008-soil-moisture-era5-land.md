# ADR-008: Wilgotność gleby z ERA5-Land (Copernicus), NASA POWER tylko jako zapas

- Status: accepted (wersja 2, 2026-11-21 12:55; zastępuje wersję 1 „NASA POWER jako źródło główne”)
- Data: 2026-11-21
- Autor: coord-1
- Powiązane: ADR-006 (aktualizacja po T-002), ADR-007 §5a, DM-015, API-004, T-010, T-032 (wont), T-037

## Kontekst

- Wilgotność gleby jest obowiązkowym elementem oceny stanu wilgotności (decyzja zespołu). EUMETSAT ASCAT odpada (T-002: brak granul po 2025-07-15, format `.nat`).
- Zespół preferuje źródła europejskie (Copernicus / ESA / ECMWF). Pozostałe kategorie już są europejskie lub krajowe: ULDK (GUGiK), ERA5 (ECMWF/C3S), Sentinel-2 (ESA), SoilGrids (ISRIC), Copernicus DEM.
- 2026-11-21 12:40 Open-Meteo zwróciło z sieci zespołu HTTP 429 „Daily API request limit exceeded” (darmowo 10 000 wywołań na dzień na IP; zapytania dłuższe niż 2 tygodnie lub z ponad 10 zmiennymi liczą się jako wiele wywołań). Sieć hackathonu ma prawdopodobnie jedno IP dla wszystkich zespołów. Prod (Synology) ma własne IP.

## Porównanie (sprawdzone na żywo 12:41–12:50)

| Opcja | Siatka | Dane do | Dostęp | Werdykt |
|---|---|---|---|---|
| ERA5-Land (ECMWF / Copernicus C3S), CC BY 4.0 | ok. 9 km, warstwy 0–7, 7–28, 28–100 cm | CDS: 2026-11-15; Open-Meteo: do ostatnich dni | Open-Meteo bez klucza (na żywo) | **źródło główne** |
| ESA CCI Soil Moisture (C3S `satellite-soil-moisture`), CC BY 4.0 | 0,25° | 2026-11-10 | tylko CDS: konto, kolejka, pliki globalne | plan rozwoju |
| CLMS SSM 1 km Europe (Sentinel-1), CDSE STAC `clms_ssm_europe_1km_daily_v1_cog` | 1 km | w katalogu CDSE do 2026-09-15 | S3 `eodata` wymaga konta (anonimowo 403) | plan rozwoju |
| CLMS SWI 1 km Europe v2 | 1 km | od 2025-07-12 (v1 kończy się 2025-07-12) | jak wyżej | odpada (za krótka seria v2) |
| EDO (JRC) WMS | ok. 5 km | — | HTTP 502 w czasie testu | odpada w MVP |
| NASA POWER (MERRA-2), dane otwarte NASA | ok. 50 km | D−2 | bez klucza, 10 lat × 7 zmiennych w 1,9 s | **zapas** |

## Decyzja

1. **Wilgotność gleby (DM-015) z ERA5-Land przez Open-Meteo**, w tym samym zapytaniu co meteo (źródło `meteo`, plik `services/sources/meteo.source.ts`), żeby nie dokładać wywołań:
   - Zmienne Open-Meteo archive: `soil_moisture_0_to_7cm`, `soil_moisture_7_to_28cm`, `soil_moisture_28_to_100cm` (m³/m³). Jeśli API ma agregaty dzienne (`daily=..._mean`), bierzemy je; inaczej `hourly` i średnia dobowa w kodzie. **Do weryfikacji na żywo** po resecie limitu (północ UTC) albo z innej sieci: nazwy zmiennych i czy dane sięgają D.
   - Przeliczenie na wilgotność względną (% pojemności wodnej) z TAW/RAW działki (SoilGrids + Saxton-Rawls, ADR-007): `(θ − θ_wp) / (θ_fc − θ_wp)`, przycięte do 0–100%. Wartość surową m³/m³ też zwracamy.
   - Wartość na datę analizy = średnia z 7 dni do D. **Percentyl względem okna ±15 dni z 10 poprzednich lat** (jak KBW), anomalia w punktach procentowych.
   - Ocena: `dry` przy percentylu ≤ 20 lub wilgotności względnej strefy korzeniowej (7–28 + 28–100 cm, średnia ważona miąższością) ≤ 30%; `wet` przy percentylu ≥ 80 lub ≥ 70%; inaczej `normal`.
   - Rola w ocenie (ADR-007 §5a): potwierdza albo przeczy klasie z KBW i NDMI, wpływa na pewność (waga 0,10 przejęta od eumetsat). Nie zmienia klasy samodzielnie.
   - `sourceId` dla wilgotności: `era5land` (osobny wpis w katalogu DM-005/API-006 i w `sources[]` raportu, żeby UI i README pokazywały go jako osobne źródło), nawet jeśli fizycznie pochodzi z tego samego wywołania co `meteo`.
2. **NASA POWER (`nasa_power`) tylko jako zapas**, plik `services/sources/nasaPower.source.ts`, jedno wywołanie dla obu celów:
   - gdy Open-Meteo zwróci 429, 5xx albo timeout: meteo z `PRECTOTCORR`, `T2M`, `T2M_MAX`, `T2M_MIN`, ET0 metodą Hargreaves-Samani (FAO-56 równ. 52, Ra z szerokości i dnia roku); wilgotność z `GWETTOP` (0–5 cm) i `GWETROOT` (strefa korzeniowa), jednostka 0–1 → %, `-999` = null, ostatni ważny dzień D−2;
   - raport podaje w `sources[]` i `limitations`, że użyto źródła zapasowego, metody Hargreavesa i siatki ok. 50 km; pewność obniżona o 0,05.
3. **Oszczędzanie limitu Open-Meteo:**
   - jedno zapytanie na analizę ze wszystkimi zmiennymi (opad, temperatury, ET0, wilgotność), bez dzielenia na zmienne;
   - cache w `source_cache` po komórce 0,1° i zakresie dat (TTL 365 dni dla dni < D−7, 6 h dla świeższych);
   - zero zapytań do Open-Meteo w testach i w trakcie developmentu poza ręcznym sprawdzeniem (fixtures z zapisanych odpowiedzi);
   - rozgrzanie cache działek demo w T-035, uruchomione z prod (własne IP).
4. `eumetsat` zostaje w enumie `sourceId` jako opcjonalny, zawsze `missing` (zgodność wstecz), bez etykiety „wilgotność gleby” w UI.
5. Plan rozwoju (README, pitch): ESA CCI Soil Moisture (czysto satelitarna, 0,25°) i Copernicus Land SSM 1 km z Sentinel-1 przez CDSE (wymagają konta i przetwarzania wsadowego).

## Licencje

- ERA5-Land: Copernicus Climate Change Service, licencja CC BY 4.0; przypisanie: „Contains modified Copernicus Climate Change Service information [rok]”, oraz Open-Meteo (CC BY 4.0, użycie niekomercyjne bez klucza).
- NASA POWER: dane NASA otwarte, przypisanie: „These data were obtained from the NASA Langley Research Center (LaRC) POWER Project funded through the NASA Earth Science/Applied Science Program.”

## Konsekwencje

- Wilgotność gleby w każdym raporcie, z europejskiego źródła o siatce ok. 9 km, spójnego z bilansem wodnym (ten sam ERA5).
- Ograniczenie: to reanaliza (model z asymilacją obserwacji), nie bezpośredni pomiar satelitarny; raport mówi to wprost, a lokalność dają SoilGrids (250 m) i Sentinel-2 (10–20 m).
- Meteo i wilgotność nie zależą od jednego dostawcy z limitem na IP (zapas NASA POWER).

## Aktualizacja 2026-11-21 15:10 (coord-1): skala procentowa ERA5-Land

- Pierwszy test na żywo z działającym Open-Meteo (inne IP) pokazał 100% pojemności przy ocenie „sucho”. Przyczyna: m³/m³ z ERA5-Land (model H-TESSEL ma własną glebę) dzielone przez pojemność polową i punkt więdnięcia działki z SoilGrids (Bronowice: θ 0,276 vs FC 0,189).
- Od teraz % liczymy na stałych gleby modelu (IFS Cy45r1, tekstura „medium”: FC 0,347, WP 0,151 m³/m³). Norma w % = bieżący % − anomalia NASA (pp), więc bieżąca wartość, norma i anomalia są w jednej skali. Percentyl i ocena nadal w całości z NASA (ADR-009).
- Bronowice 2026-05-25: strefa korzeniowa 64%, norma 71%, −6,6 pp, percentyl 3, „sucho”. Bilans wiadra (TAW/RAW z SoilGrids) bez zmian.
