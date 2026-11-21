# Kropelka: zatrzymaj wodę, chroń plony

Aplikacja webowa dla rolnika (zadanie KOWR „Zatrzymaj wodę, chroń plony”). Rolnik podaje numer działki ewidencyjnej albo klika ją na mapie, wybiera uprawę i datę analizy. Aplikacja pobiera dane z pięciu kategorii (meteorologiczne, satelitarne, glebowe, hydrologiczne, przestrzenne), liczy bilans wodny i podatność działki na suszę z 10 lat, a wynik podaje w raporcie w prostym języku: stan i przyczyny niedoboru, rekomendacje w kolejności retencja, agrotechnika, nawadnianie (opcjonalnie), źródła, daty i ograniczenia.

**Wynik i rekomendacje oblicza aplikacja z pobranych danych, według jawnych reguł (ADR-007). Nie robi tego model AI i nie wyświetlamy gotowych, wcześniej przygotowanych rekomendacji.**

- Prototyp: https://app.kamil-zielinski.pl (wdrożenie w toku)
- Repozytorium jest prywatne i pozostaje niepubliczne co najmniej do końca wydarzenia; dostęp dla jury według instrukcji Platformy konkursowej.
- Dane demo: działka `061409_2.0009.612` (Bronowice, gm. Puławy), pszenica ozima, data analizy 2026-05-25.

## 1. Instrukcja uruchomienia

Wymagania: Node.js 20.19+, npm 10+, git, własny klaster MongoDB Atlas (darmowy M0 wystarczy). Bez Dockera, bez instalowania dodatkowych narzędzi systemowych, bez kluczy API do źródeł danych.

```bash
git clone <adres repozytorium przekazany jury> kropelka && cd kropelka
cp .env.example .env     # uzupełnij MONGODB_URI (własny klaster MongoDB Atlas)
npm install
npm run dev              # front http://localhost:5173, API http://localhost:3000/api/v1
```

Użyteczne komendy: `npm run build`, `npm run typecheck`, `npm test` (Vitest: silnik obliczeń i źródła danych), `npm run lint`.

Zmienne w `.env` (wzór: `.env.example`):

| Zmienna | Znaczenie |
|---|---|
| `MONGODB_URI`, `MONGODB_DB` | połączenie z MongoDB Atlas i nazwa bazy (wymagane) |
| `PORT`, `CORS_ORIGIN`, `VITE_API_URL` | porty i adresy dev (domyślne wartości z wzoru działają lokalnie) |
| `VITE_USE_MOCKS` | `true` = frontend na danych przykładowych z kontraktu, bez backendu (tylko do prac nad UI; analiza dla jury wymaga `false`) |
| `ANALYSIS_BUDGET_MS` | łączny budżet czasu analizy (domyślnie 25000) |
| `JWT_SECRET` | sekret tokenów logowania; w dev pusty = losowy przy starcie, w produkcji wymagany |
| `EUMETSAT_*`, `OVERPASS_*` | opcjonalne (źródło EUMETSAT jest wyłączone w MVP, patrz sekcja 4; adresy Overpass to zapas) |

Aplikacja działa w przeglądarkach Chrome, Firefox, Edge, Safari i Opera bez instalacji po stronie użytkownika; układ jest responsywny (telefon i komputer).

## 2. Opis podstawowych funkcji

1. **Wskazanie działki:** numer ewidencyjny (TERYT, np. `061409_2.0009.612`) albo kliknięcie na mapie (geometria z ULDK GUGiK).
2. **Wybór uprawy** (pszenica ozima, jęczmień jary, kukurydza, ziemniak, rzepak ozimy, burak cukrowy, użytki zielone) i **daty analizy** (dziś lub dowolna z ostatnich 10 lat).
3. **Pobranie danych na żywo** z 5 kategorii, z widocznym stanem każdego źródła (ok / z cache / brak danych / przekroczony czas).
4. **Ocena sytuacji wodnej:** klimatyczny bilans wodny (opad minus zapotrzebowanie uprawy), klasa suszy bieżącej (brak / umiarkowana / silna), wilgotność gleby, wskaźniki satelitarne NDVI i NDMI interpretowane przez uprawę i miesiąc, historyczna podatność na niedobory z 10 sezonów (miesiące krytyczne).
5. **Przyczyny niedoboru** z dowodami w liczbach (deficyt opadów i upał, niska retencja gleby, spływ powierzchniowy, zapotrzebowanie uprawy, niska wilgotność roślinności).
6. **Rekomendacje w stałej kolejności:** retencja krajobrazowa, retencja glebowa, agrotechnika, nawadnianie (zasadność, termin, dawka). Każda z uzasadnieniem w danych.
7. **Raport:** data i źródła, poziom pewności z jego powodami, jawne braki danych, ograniczenia. Zapis w systemie (link do raportu), wydruk lub PDF (`/report/:id/print`, w oknie druku „Zapisz jako PDF”).
8. **Konto gospodarstwa (opcjonalne, ADR-010):** e-mail i hasło, własna nazwa gospodarstwa (podana przy rejestracji, do zmiany na ekranie konta), wielu członków konta, historia zapisanych raportów. Analiza bez logowania działa w całości.
9. **Podgląd działki przed analizą:** przycisk „Podgląd tej działki” przybliża mapę do granicy z ULDK, żeby rolnik upewnił się, że to jego działka.
10. **Nawigacja:** w nagłówku „Panel” (konto gospodarstwa), „Szukaj działki” (powrót z zachowaną działką) i „Dodaj działkę” (nowa analiza od zera), na ekranach kroków przycisk „Wstecz”.

## 3. Skrócony opis architektury

```
Przeglądarka (React + MUI + Leaflet)
        |  REST /api/v1
        v
Backend (Node + Express + TypeScript)
  route -> validate (Zod) -> controller -> service
  services/sources/*   po jednym pliku na źródło: pobranie, parsowanie, cache
  services/engine/*    czyste funkcje: bilans wodny, percentyle, Saxton-Rawls, klasa suszy, reguły rekomendacji
        |                          |
        v                          v
Źródła zewnętrzne (HTTPS)     MongoDB Atlas (raporty, konta, cache odpowiedzi źródeł z TTL)
```

- Wszystkie wywołania źródeł wykonuje backend. Źródła startują równolegle, każde z własnym limitem czasu; twardy budżet całej analizy to 25 s (cel: rekomendacja w ≤ 30 s).
- W cache zapisujemy wynik już przetworzony (statystyki, nie rastry). TTL: 365 dni dla dat starszych niż tydzień, krócej dla świeżych.
- Awaria źródła nie jest zastępowana wartością domyślną: wskaźniki zależne od niego mają status „brak danych”, odpowiednie reguły się nie uruchamiają, a pewność raportu spada. Tylko brak geometrii działki przerywa analizę.
- Metodyka (ADR-007): FAO-56 (ETc = ET0 · Kc), klimatyczny bilans wodny w oknach 30 i 60 dni (jak w IUNG-PIB), pojemność wodna gleby wg Saxton i Rawls (2006), bilans „wiadra” (deficyt glebowy względem RAW). Progi i reguły są jawne w kodzie (`apps/backend/src/services/engine`).
- Dane bieżące (okno D−90…D) z Open-Meteo (ERA5 / ERA5-Land); tło wieloletnie (percentyl, anomalia, podatność z 10 lat) w całości z NASA POWER, żeby nie porównywać wartości z różnych źródeł (ADR-009).
- Struktura repo: `apps/frontend`, `apps/backend`, `database` (modele i seed), `contracts` (kontrakty API, modelu danych i UI), `docs/adr` (decyzje).

## 4. Źródła i zakresy danych

Wszystkie źródła są bezpłatne i nie wymagają konta ani klucza. Katalog źródeł jest też dostępny z aplikacji (endpoint `GET /api/v1/sources`).

| Kategoria | Źródło | Dostawca | Rozdzielczość / zakres | Licencja |
|---|---|---|---|---|
| Przestrzenne | ULDK (geometria działki po ID lub punkcie) | GUGiK | działka ewidencyjna, wektor | dane PZGiK/EGiB, bezpłatne (Prawo geodezyjne i kartograficzne) |
| Meteo (bieżące) | Open-Meteo Historical (ERA5): opad, temperatura, ET0 FAO-56 | Open-Meteo, dane ECMWF/Copernicus | siatka ok. 9–25 km, dane dobowe, okno 90 dni do daty analizy | CC BY 4.0 |
| Wilgotność gleby (bieżąca) | ERA5-Land przez Open-Meteo, warstwy 0–7, 7–28, 28–100 cm | ECMWF / Copernicus C3S | siatka ok. 9 km, dane dobowe | CC BY 4.0, atrybucja Copernicus C3S i Open-Meteo |
| Meteo i gleba (tło 10 lat, zapas) | NASA POWER Daily (reanaliza MERRA-2) | NASA LaRC POWER | siatka ok. 50 km (0,5° × 0,625°), dobowe, 10 lat przed datą analizy | dane NASA, otwarte, atrybucja NASA LaRC POWER |
| Satelitarne | Sentinel-2 L2A (NDVI 10 m, NDMI 20 m, maska chmur SCL); główne: Microsoft Planetary Computer STAC, zapas: Earth Search (Element 84) | ESA Copernicus | 10–20 m, archiwum od 11/2016 | Copernicus Sentinel (wolna licencja), katalog CC0 |
| Satelitarne (opcjonalne) | EUMETSAT ASCAT SSM | EUMETSAT / H SAF | 12,5–25 km | polityka danych EUMETSAT / H SAF, warunki do potwierdzenia |
| Glebowe | SoilGrids 2.0 (piasek, ił, węgiel organiczny, 5 warstw do 100 cm; WCS) | ISRIC | 250 m | CC BY 4.0 |
| Teren | Copernicus DEM GLO-90 (przez Open-Meteo Elevation): spadek, kierunek, najniższy punkt | ESA Copernicus / Open-Meteo | 90 m | licencja Copernicus DEM (z atrybucją), Open-Meteo CC BY 4.0 |
| Hydrologiczne | OpenStreetMap API 0.6 (cieki, rowy, zbiorniki, mokradła w promieniu 1 km; zapas: Overpass) | OpenStreetMap contributors | wektor, 1 km od centroidu | ODbL 1.0, „© OpenStreetMap contributors” |

Uwagi:
- **EUMETSAT** jest w MVP wyłączony (brak dostępu: produkt ASCAT nie ma w Data Store granul po 2025-07-15, a starsze są w formacie nieobsługiwanym przez aplikację). Źródło zwraca zawsze „brak danych” i nie wpływa na wynik. Warunki licencji do potwierdzenia, gdyby było włączone.
- Zakres czasowy: data analizy dowolna z ostatnich 10 lat; do obliczeń trafiają wyłącznie dane z dni nie późniejszych niż data analizy.
- Podkład mapy: OpenStreetMap (ODbL), opcjonalnie ortofotomapa Geoportal (WMS).

## 5. Dane na żywo i dane przetworzone wcześniej

**Wszystkie dane źródłowe są pobierane na żywo w chwili analizy, a wynik liczy aplikacja.** Nie ma wcześniej przygotowanych wyników ani rekomendacji.

| Co | Tryb |
|---|---|
| Geometria działki, meteo i wilgotność (90 dni), tło 10 lat NASA POWER, Sentinel-2, SoilGrids, DEM, OSM | pobierane na żywo przy analizie; odpowiedź zapisywana w cache (MongoDB, TTL: ULDK i OSM 30 dni, pozostałe 365 dni dla dat starszych niż tydzień, 6 h dla meteo, wilgotności i NASA oraz 24 h dla Sentinel-2 przy datach świeższych) |
| Tabele współczynników upraw (Kc, głębokość korzeni, faza krytyczna, oczekiwane zakresy NDVI/NDMI) | stałe w kodzie, opracowane na podstawie FAO-56; jedyne dane „przetworzone wcześniej” |
| Cache odpowiedzi źródeł | wynik wcześniejszego pobrania z tego samego źródła; w raporcie status „z cache” i data pobrania |
| Działki demo | przed pokazem możemy rozgrzać cache zwykłym wywołaniem analizy (bez zapisanych wyników) |

Cache działki demo (061409_2.0009.612, pszenica, 2026-05-25) rozgrzany 2026-11-21 ok. 15:36 w bazie dev; na prod rozgrzewany po wdrożeniu i rano w dniu prezentacji.

## 6. Wykaz bibliotek, komponentów, modeli, usług zewnętrznych i narzędzi AI

**Frontend:** React 18, TypeScript, Vite, MUI (`@mui/material`, `@mui/icons-material`, `@mui/x-charts`), Emotion, Zustand, TanStack Query, React Hook Form, Zod, react-router-dom, Leaflet i react-leaflet.

**Backend:** Node.js 20+, Express, TypeScript, Zod, Mongoose, `@turf/turf` (geometria), `proj4` (rzutowania), `wellknown` (WKT na GeoJSON), `geotiff` (odczyt okna z rastrów COG Sentinel-2 i SoilGrids), `cors`, `dotenv`. Haszowanie haseł i tokeny JWT: wbudowany moduł `crypto` Node (bez dodatkowych bibliotek).

**Narzędzia deweloperskie:** npm workspaces, esbuild, tsx, Vitest, ESLint, Prettier, concurrently.

**Baza:** MongoDB Atlas (raporty, konta, cache źródeł).

**Usługi zewnętrzne:** ULDK GUGiK, Open-Meteo (archiwum, elevation), NASA POWER, Microsoft Planetary Computer, Earth Search (Element 84, AWS), ISRIC SoilGrids, OpenStreetMap (API 0.6, kafle mapy), opcjonalnie Geoportal WMS. Wdrożenie produkcyjne: Synology z Cloudflare Tunnel.

**Modele naukowe (zaimplementowane w kodzie):** FAO-56 (Penman-Monteith dla ET0 w NASA POWER, współczynniki Kc), klimatyczny bilans wodny IUNG-PIB, Saxton i Rawls (2006) dla pojemności wodnej gleby.

**Narzędzia AI:** Claude (Claude Code, Anthropic) był narzędziem programistycznym zespołu: pomagał pisać kod, testy i dokumentację. **Nie uczestniczy w liczeniu wyników ani w generowaniu rekomendacji w działającej aplikacji**; aplikacja nie wywołuje żadnego modelu AI w czasie analizy.

## 7. Licencje i warunki korzystania z danych i komponentów

- Dane: licencje w tabeli w sekcji 4. Wymagane atrybucje (Copernicus C3S i Open-Meteo, NASA LaRC POWER, OpenStreetMap, ESA Copernicus Sentinel) są wyświetlane w raporcie przy źródłach.
- Open-Meteo: bezpłatne użycie niekomercyjne bez klucza (CC BY 4.0), z limitem zapytań na adres IP. Użycie komercyjne wymagałoby planu płatnego lub własnego ekstraktu danych ERA5.
- API OpenStreetMap 0.6: zasady użycia zniechęcają do intensywnego odczytu; przy pojedynczych analizach i cache 30 dni akceptowalne. Docelowo: własny ekstrakt OSM dla Polski (np. Geofabrik) lub dane MPHP.
- Dane ULDK/EGiB: udostępniane bezpłatnie przez GUGiK na zasadach Prawa geodezyjnego i kartograficznego.
- Komponenty: biblioteki z sekcji 6 na licencjach open source (głównie MIT, Apache-2.0, BSD); wykaz w `package.json` i `package-lock.json`.
- Aplikacja nie zbiera danych osobowych poza opcjonalnym kontem (e-mail i hasło zapisane jako skrót scrypt).
- Kod aplikacji: MIT (plik LICENSE).

## 8. Znane ograniczenia

- **Rozdzielczość:** tło 10 lat z NASA POWER ma siatkę ok. 50 km, więc percentyl i podatność opisują region, a nie samą działkę. Dane bieżące ERA5-Land mają ok. 9 km, SoilGrids 250 m (model, nie pomiar na działce), DEM 90 m, Sentinel-2 10–20 m (małe działki mają mało pikseli).
- **Chmury:** gdy w ostatnich 45 dniach przed datą analizy nie ma sceny Sentinel-2 z wystarczającą liczbą ważnych pikseli, wskaźniki satelitarne są oznaczone jako brak danych (kod `CLOUD_COVER`), a pewność raportu spada.
- **Limit Open-Meteo:** darmowy limit dzienny na adres IP (HTTP 429). W takim przypadku aplikacja przełącza się na zapas z NASA POWER (siatka ok. 50 km, metoda Hargreavesa dla dni bez pełnych danych) i podaje to w ograniczeniach.
- **Opóźnienie NASA POWER:** dane z opóźnieniem ok. 3–6 dni (promieniowanie ok. 6 dni; dla tych dni szacowane z amplitudy temperatury); ostatnie dni okna bieżącego z Open-Meteo to częściowo dopełnienie modelem.
- **Wilgotność gleby** to reanaliza (model z asymilacją obserwacji), nie bezpośredni pomiar satelitarny. Procent pojemności liczymy na stałych gleby modelu ERA5-Land.
- **Hydrologia z OSM:** rowy i małe cieki bywają niekompletne; bez danych z MPHP/ISOK. Jeśli źródło nie odpowie, rekomendacje zależne od cieków się nie pojawiają.
- **Krótki szereg:** rozkład odniesienia z 10 lat. Poza sezonem wegetacyjnym (XI–II) ocena jest orientacyjna.
- **Nieuwzględnione:** prognoza pogody, zabiegi i nawadnianie wykonane na działce, zasięg korzeni zależny od stanowiska, lokalne zasilanie wodami gruntowymi, jakość wody.
- **EUMETSAT:** wyłączony w MVP (sekcja 4).
- Logowanie: bez resetu hasła i bez wysyłania e-maili (zaproszenia członków przekazuje się ręcznie).

### Koszty i usługi płatne

- **Dziś (prototyp): koszt zbliżony do zera.** ULDK, NASA POWER, SoilGrids, Microsoft Planetary Computer i OpenStreetMap są bezpłatne (limity uczciwego użycia, bez kluczy). Hosting produkcyjny: Synology + Cloudflare Tunnel (poza prądem i sprzętem ok. 0 zł).
- **Open-Meteo:** bezpłatne użycie niekomercyjne, 10 000 wywołań dziennie na adres IP; jedna analiza to ok. 6 wywołań (ADR-009), czyli ok. 1600 analiz dziennie z jednego IP. Użycie komercyjne wymaga planu płatnego; Standard (ok. 29 USD/mies., 1 mln wywołań) nie ma Historical API, potrzebny Professional: ok. 99 USD/mies., 5 mln wywołań (ok. 800 tys. analiz miesięcznie). Ceny z ogłoszenia Open-Meteo, sprawdzone 2026-11-21; wiążący jest cennik open-meteo.com/en/pricing.
- **MongoDB Atlas:** w dev klaster współdzielony (darmowy). Przy wzroście ruchu i rozmiaru cache produkcja wymaga płatnego tieru: Flex do ok. 30 USD/mies. (start), dedykowany M10 od ok. 0,08 USD/h, czyli ok. 57 USD/mies. (AWS, zależnie od regionu). Ceny z mongodb.com/pricing, sprawdzone 2026-11-21. Szacunek na start w skali kraju: ok. 130–160 USD/mies. (Open-Meteo Professional + Atlas M10), hosting na własnym sprzęcie.
- **Alternatywy bez opłat licencyjnych:** własny mirror ERA5 z Copernicus CDS (bezpłatny, kosztem dysku i utrzymania), dane IMGW-PIB dla stacji w Polsce, własny ekstrakt OSM (Geofabrik) zamiast API.

### Skalowalność

- **Limity i buforowanie:** odpowiedzi źródeł trafiają do cache w MongoDB (`source_cache`, TTL 365 dni dla dat historycznych, krótszy dla bieżących) oraz do pamięci procesu (LRU 50 wpisów). Raport z cache trwa ok. 0,3 s, zimny 8–20 s (budżet 25 s). Powtórne analizy tej samej okolicy nie zużywają limitów źródeł.
- **Zapis wyników:** raporty są zapisywane i otwierane po linku bez ponownego liczenia.
- **Ograniczanie zapytań:** równoległe pobieranie z limitem czasu na źródło, limit nieudanych logowań (10 / 15 min), przy 429 z Open-Meteo przełączenie na zapas NASA POWER.
- **Aktualizacja danych:** dane bieżące wygasają w cache po kilku godzinach, historyczne po roku; przy kolejnej analizie pobierane są ponownie.
- **Szybkość przy większym ruchu (kierunki, nie zaimplementowane):** kolejka zadań i pre-cache popularnych działek, więcej instancji backendu za Cloudflare, własny mirror ERA5.
- **Koszty infrastruktury:** wzrost to głównie płatny plan Open-Meteo, płatny tier Atlas i serwer w chmurze zamiast Synology (do wyceny przy realnym ruchu).

## Bezpieczeństwo i dane osobowe

- **Co zbieramy i po co:** tylko dla opcjonalnego konta (ADR-010): e-mail (identyfikator logowania), hasło i imię (do wyświetlania członków konta). Analiza i raport działają bez konta, a raport anonimowy nie zawiera danych osobowych (`GET /analyses/:id` jest publiczny, więc link do raportu może otworzyć każdy, kto go zna).
- **Hasła:** zapisywane wyłącznie jako skrót `crypto.scrypt`; sesja to token JWT HS256 ważny 7 dni; limit 10 nieudanych logowań na 15 minut.
- **Sekrety:** `MONGODB_URI` i `JWT_SECRET` tylko w `.env` (poza repozytorium); w produkcji `JWT_SECRET` jest wymagany.
- **CORS:** API przyjmuje żądania z origin ustawionego w `CORS_ORIGIN`.

## 9. Sposób weryfikacji wyników i rekomendacji

- **Jawne progi i wzory:** każda wartość w raporcie ma w `evidence[]` liczby ze źródłem i datą; reguły rekomendacji (R-LAND, R-SOIL, R-AGRO, nawadnianie) i progi są opisane w `docs/adr/ADR-007-methodology.md` i w kodzie silnika, z wersją metodyki w raporcie.
- **Testy automatyczne** (`npm test`, Vitest): silnik obliczeń na zbiorach syntetycznych (bilans wodny i percentyl, Saxton-Rawls, klasy suszy, reguły rekomendacji, ET0 Penman-Monteith na przykładzie z FAO-56) oraz parsowanie źródeł na zapisanych odpowiedziach.
- **Odtwarzalność:** ta sama działka, uprawa i data dają ten sam wynik; data analizy ucina dane po dniu analizy.
- **Test na działkach z kilku lokalizacji w Polsce:** wyniki sprawdziliśmy ręcznie na 8 lokalizacjach, co doprowadziło do korekty progów klasy suszy i podatności (ADR-007, aktualizacja 14:20).
- **Weryfikacja na działce demo** (`061409_2.0009.612`, pszenica ozima, 2026-05-25): wilgotność strefy korzeniowej 64% wobec normy 71% (−6,6 pp, percentyl 3, ocena „sucho”).
- **Porównanie z danymi referencyjnymi (IUNG-PIB):** 6 działek z różnych regionów i gleb, 2 okresy raportowe Systemu Monitoringu Suszy Rolniczej IUNG-PIB (tabele „Zagrożenie suszą na poziomie gminy”, https://susza.iung.pulawy.pl/wykazy/, dostęp 2026-11-21). Kropelka liczona na koniec okresu IUNG dla tej samej uprawy. Klasy IUNG: susza = co najmniej 50% powierzchni gminy zagrożone, częściowa = 10–50%, brak = poniżej 10%. Uwaga: analizy liczone z sieci z limitem Open-Meteo, więc dane bieżące we wszystkich wierszach pochodzą z zapasowego NASA POWER (siatka ok. 50 km).

  | Działka | Gmina | Uprawa | Okres IUNG | IUNG (udział pow. zagrożonej) | Kropelka (klasa, percentyl KBW60, KBW60) | Zgodność |
  |---|---|---|---|---|---|---|
  | 061409_2.0009.612 | Puławy (gm. wiejska) | zboża ozime | 21.V–20.VII.2023 | częściowa (39%) | silna, p21, −154 mm | częściowo |
  | 302504_5.0029.66 | Środa Wielkopolska | zboża ozime | 21.V–20.VII.2023 | susza (94%) | silna, p21, −168 mm | tak |
  | 040706_4.0004.15 | Kruszwica | burak cukrowy | 21.V–20.VII.2023 | częściowa (36%) | silna, p9, −179 mm | częściowo |
  | 221002_4.0004.136 | Nowy Dwór Gdański | rzepak | 11.V–10.VII.2023 | susza (99,8%) | silna, p1, −113 mm | tak |
  | 161002_4.0241.261 | Głogówek | kukurydza na ziarno | 21.V–20.VII.2023 | brak (0,6%) | silna, p14, −113 mm | nie |
  | 080906_5.0018.138/3 | Sulechów | zboża jare | 21.V–20.VII.2023 | susza (92%) | silna, p21, −147 mm | tak |
  | 061409_2.0009.612 | Puławy (gm. wiejska) | zboża ozime | 1.IV–31.V.2024 | susza (52%) | silna, p10, −118 mm | tak |
  | 302504_5.0029.66 | Środa Wielkopolska | zboża ozime | 1.IV–31.V.2024 | brak (1,7%) | silna, p27, −102 mm | nie |
  | 040706_4.0004.15 | Kruszwica | burak cukrowy | 1.IV–31.V.2024 | brak (0%) | brak, p43, +11 mm | tak |
  | 221002_4.0004.136 | Nowy Dwór Gdański | rzepak | 1.IV–31.V.2024 | brak (0%) | brak, p61, −48 mm | tak |
  | 161002_4.0241.261 | Głogówek | zboża ozime | 1.IV–31.V.2024 | brak (0%) | silna, p20, −85 mm | nie |
  | 080906_5.0018.138/3 | Sulechów | zboża jare | 1.IV–31.V.2024 | częściowa (41%) | umiarkowana, p36, −57 mm | częściowo |

  **Wynik:** 6 z 12 zgodnych, 3 częściowo (IUNG: susza na 10–50% gminy, Kropelka: susza na działce), 3 niezgodne. Próba jest mała (6 działek, 2 okresy), więc to sprawdzenie kierunku, nie walidacja statystyczna. Kropelka zgadza się z IUNG przy rozległej suszy i przy jej braku. Wszystkie 3 niezgodności to fałszywe alarmy Kropelki (susza silna, gdy IUNG wskazuje poniżej 2% powierzchni gminy) przy percentylu KBW60 14–27: klasę podniosła reguła „deficyt w strefie korzeni większy od RAW i percentyl ≤ 30” (ADR-007 §6) liczona na danych zapasowych NASA. Możliwe przyczyny: lokalne opady niewidoczne w siatce 50 km, KBW IUNG z interpolacji danych stacji i agregacja na gminę i kategorię gleby, u nas jedna działka z glebą SoilGrids. Ich wpływu nie mierzyliśmy. Wnioski wprowadzone do metodyki (ADR-007, aktualizacja z 2026-11-21 17:55, T-055): przy zapasie NASA POWER susza silna tylko przy percentylu KBW60 ≤ 10. Po tej zmianie 3 fałszywe alarmy (Głogówek 2023 i 2024, Środa Wlkp. 2024) dają suszę umiarkowaną zamiast silnej; Bronowice 2024 (p10) zostają przy silnej. Powtórka całej tabeli na danych ERA5: w trakcie.
- **Niepewność:** raport podaje poziom pewności (wysoka / średnia / niska) z listą powodów obniżenia oraz braki danych wprost, bez pozornej precyzji.

### Podstawy naukowe

Metodyka: `docs/adr/ADR-007-methodology.md`.

- **Allen i in., FAO-56 (Crop evapotranspiration):** z niego pochodzą Penman-Monteith dla ET0, ETc = ET0 · Kc, współczynniki Kc oraz bilans wodny gleby z TAW/RAW.
- **Doroszewski i in. 2012, IUNG, System Monitoringu Suszy Rolniczej (KBW):** wzór klimatycznego bilansu wodnego w oknach 30 i 60 dni oraz klasy suszy.
- **European Commission 2014/2015, NWRM (Natural Water Retention Measures):** kolejność rekomendacji retencja, agrotechnika, nawadnianie, zgodnie z zasadą „retain water where it falls”.
- **Minasny i in. 2017, „4 per mille”:** uzasadnienie roli materii organicznej gleby w retencji wody w rekomendacjach glebowych.
- **Żyłowska i Kozyra 2025:** przegląd systemów i wskaźników monitorowania suszy, kontekst dla naszego zestawu wskaźników (KBW, percentyl na tle 10 lat, wilgotność gleby, NDVI/NDMI); same progi klas wynikają z FAO-56 i metodyki IUNG (ADR-007).
- **Saxton i Rawls 2006:** pojemność wodna gleby (punkt więdnięcia, pojemność polowa) liczona z uziarnienia i węgla organicznego z SoilGrids.

---

Jak pracuje zespół: [docs/hacknation-workflow.md](docs/hacknation-workflow.md)
