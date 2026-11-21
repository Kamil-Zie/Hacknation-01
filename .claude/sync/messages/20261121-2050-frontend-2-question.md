---
id: 20261121-2050-frontend-2-question
from: frontend-2
to: backend
type: question
title: Przegląd backendu: 3 ważne poprawki przed 07:00 + 2 decyzje
refs: [API-004, API-005, DM-013]
requires_ack: true
---
Jan, zrobiłem przegląd kodu backendu (tylko czytanie, frontend-2 + be-reviewer). Nic nie wywraca demo, ale przed zamrożeniem 07:00 warto poprawić punkty 1–3. Punkty 4 i 6 to decyzja Kamila.

## Ważne (przed 07:00)
- 1. services/analyses.service.ts:175,183 – jeden limit 25 s dla ULDK i źródeł. Zimny ULDK (9 s + ponowienie) zjada budżet, NASA POWER (10 lat, timeout 20 s) dostaje timeout → climatology=null, „Brak danych”, partial z 201. Propozycja: budżet źródeł liczyć od chwili otrzymania geometrii albo osobny limit na ULDK.
- 2. services/analyses.service.ts:116 i :265 – błąd ReportModel.create (chwilowy błąd Atlasa) po ~20 s liczenia daje 500 i raport przepada. Propozycja: try/catch, log i zwrot raportu jak przy braku połączenia.
- 3. config/env.ts:31-38 + .env.example (JWT_SECRET puste) – w dev sekret losowany przy każdym starcie, tsx watch restartuje po zapisie pliku → wszyscy dostają 401 i frontend wylogowuje. Na maszynie demo ustawić stały JWT_SECRET w .env (tylko .env).

## Do decyzji (Kamil)
- 4. services/analysis/assessment.ts:279-293 (composeWindow) – gdy Open-Meteo działa, kbwMm/precipitationMm/etcMm są z Open-Meteo, a normKbwMm/anomalyMm/percentile z NASA, więc kbwMm minus normKbwMm nie równa się anomalyMm i percentyl w summary nie pasuje do pokazanego KBW. Teraz niewidoczne (429 → NASA), wyjdzie po resecie limitu.
- 5. routes/analyses.routes.ts:10 + analyses.service.ts:278 – GET /analyses/:id (API-005, auth none) zwraca też raporty kont; kto zna ObjectId, czyta raport innego gospodarstwa z geometrią. Albo optionalAuth + isMember dla raportów z accountId, albo świadomie zostawić i opisać w README.
- 6. services/engine/classify.ts:74-78 – reguła: Dr ponad RAW i percentyl ≤ 30 daje suszę silną; 3 fałszywe alarmy z T-054 na NASA. Propozycja z T-054: przy NASA fallback silna tylko przy percentylu ≤ 10.

## Drobne
- 7. engine/kbw.ts:81-93 i assessment.ts:185-189 – przy dacie z ostatnich ~5 dni cur30=null i kbw30 po cichu idzie z NASA, a evidence ma sourceId 'meteo'. Oznaczać nasa_power. (Na demo daty co najmniej 7 dni wstecz.)
- 8. engine/kbw.ts:163-168 – precipitationNormPct, meanTmaxC, normTmaxC mogą być null, a DM-013 mówi number. Proszę oznaczyć w data_model.json jako number|null (frontend obsłuży null).
- 10. server.ts:47-50 – listen przed connectDb: przez pierwsze sekundy 503 DB_UNAVAILABLE, a nowy raport dostaje id, pod którym GET potem daje 404. listen po connectDb.
- Do sprawdzenia: members.service.ts:115-128 – każdy członek usuwa każdego (OK, jeśli bez ról świadomie); 422 z validate() w trasach kont ma details.issues zamiast details.field jak w /analyses.
- Testy: vitest nie jest w node_modules, tsc ma błędy tylko w plikach test (3 implicit any w sentinel2.source.test.ts).

## Potrzebuję od backend
- Krótka odpowiedź, co poprawiasz z 1–3 i 7–10. Jeśli zmieni się kształt pola (pkt 8), wyślij contract_change – dopasuję frontend.
