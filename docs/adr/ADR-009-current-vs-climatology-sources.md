# ADR-009: Dane bieżące z Open-Meteo (ERA5 / ERA5-Land), klimatologia 10 lat z NASA POWER

- Status: accepted
- Data: 2026-11-21 13:05
- Autor: coord-1
- Powiązane: ADR-006, ADR-007 (§ KBW, percentyl, podatność), ADR-008 v2, T-010, T-017, T-037, T-035

## Kontekst

- Zespół chce aktualnych danych i nie chce pobierać 10 lat z Open-Meteo: 10–20 lat dziennie to setki „wywołań” z darmowego limitu 10 000 na dzień na IP, a sieć hackathonu już ten limit wyczerpała (HTTP 429, 12:40).
- KOWR wymaga jednak oceny na tle 10 lat (3.2 pkt 1, 3.3 pkt 4) i testuje daty historyczne z ostatnich 10 lat, więc historii nie można wyciąć (decyzja użytkownika 13:04: „historia z lżejszego źródła”).
- NASA POWER daje 10 lat × 7 zmiennych w jednym zapytaniu w ok. 1,9 s, bez klucza i bez limitu Open-Meteo (sprawdzone 12:41).

## Decyzja

1. **Okno bieżące = D − 90 dni … D, z Open-Meteo** (`meteo` i `era5land`, jedno zapytanie): opad, temperatury, ET0 FAO-56 i wilgotność gleby ERA5-Land. To są **wartości bezwzględne pokazywane w raporcie**: KBW 30/60 dni w mm, ETc uprawy, bilans wiadra, wilgotność w m³/m³ i % pojemności. Około 6 „wywołań” Open-Meteo na analizę zamiast setek.
2. **Klimatologia = D − 10 lat − 75 dni … D, z NASA POWER** (`nasa_power`, jedno zapytanie, parametry `PRECTOTCORR`, `T2M`, `T2M_MAX`, `T2M_MIN`, `GWETTOP`, `GWETROOT`): rozkład odniesienia, percentyle, anomalie i podatność wieloletnia (sezony z deficytem, krytyczne miesiące).
3. **Spójność (najważniejsze):** percentyl i anomalię liczymy **w całości w jednym źródle**: wartość okna bieżącego z NASA POWER porównana z rozkładem z NASA POWER (ET0 Hargreaves-Samani po obu stronach). Nie porównujemy wartości ERA5 z rozkładem NASA, bo różne źródła mają różne obciążenia. Raport pokazuje:
   - stan bieżący w mm i % z ERA5 / ERA5-Land (ok. 9 km, europejskie),
   - „jak to wypada na tle 10 lat” (percentyl, anomalia, klasa) z NASA POWER (ok. 50 km),
   - w `sources[]` oba źródła z rolą (`role: current | climatology | fallback` w nocie DM-011), a w `limitations` zdanie o tym podziale.
4. **Silnik bez zmian w regułach:** `engine` (T-009, T-014) dostaje serię dzienną i datę D. Orkiestrator (T-017) woła go dwa razy: na serii NASA POWER (percentyl, anomalia, klasa KBW, podatność) i na serii ERA5 z 90 dni (wartości bieżące, bilans wiadra). Klasa suszy wynika z percentyla NASA potwierdzonego albo podważonego przez wilgotność ERA5-Land i NDMI (ADR-007 §5a).
5. **Zapas:** gdy Open-Meteo da 429/5xx/timeout, okno bieżące też bierzemy z NASA POWER (ADR-008 pkt 2; dane do D−2). Gdy NASA POWER nie odpowie, percentyl i podatność = null + dataGap, a raport pokazuje sam stan bieżący z obniżoną pewnością. Nigdy nie dopytujemy Open-Meteo o 10 lat.
6. **Data analizy historyczna** (jury): to samo — Open-Meteo archiwum dla D−90…D (dalej 1 zapytanie), NASA POWER dla 10 lat przed D. Cache po komórce 0,1° i zakresie: TTL 365 dni dla D < dziś − 7.

## Konsekwencje

- Aktualność bez zmian (Open-Meteo ma dane do dziś), zużycie limitu Open-Meteo spada mniej więcej 50 razy, czas analizy krótszy (NASA ok. 2 s równolegle).
- Zgodność z KOWR 3.2 / 3.3 pkt 4 i testami jury na daty historyczne zachowana.
- Ograniczenie do opisania w raporcie i README: tło wieloletnie ma siatkę ok. 50 km i ET0 metodą Hargreavesa (nie Penman-Monteith), więc percentyl opisuje region, a nie samą działkę.
