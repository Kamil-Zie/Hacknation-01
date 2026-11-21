# ADR-006: Źródła danych, budżet czasu i cache

- Status: accepted (endpointy do potwierdzenia w pierwszym zadaniu backendu, patrz „Do sprawdzenia”)
- Data: 2026-11-21
- Autor: coord-architect
- Powiązane: ADR-005, ADR-007, `contracts/api.json` (API-001, API-002, API-004, API-006), `contracts/data_model.json` (DM-002, DM-005, DM-011)

## Kontekst

Zadanie KOWR wymaga 5 kategorii danych (meteo, satelita, gleba, hydrologia, przestrzenne), pobieranych przez aplikację, darmowych, bez kont, z opisaną licencją, dla dowolnej działki w Polsce i dowolnej daty z ostatnich 10 lat, z wynikiem w ≤ 30 s. Żadne dane spoza daty analizy (po niej) nie mogą wejść do obliczeń.

## Decyzja: źródła

Wszystkie wywołania robi backend (brak problemów z CORS, jeden cache). Jeden plik `services/sources/<id>.source.ts` na źródło. `sourceId` jest wspólny dla DM-005, DM-011 i DM-002.

| sourceId | Kategoria | Endpoint (bez konta) | Co bierzemy | Licencja | Timeout | TTL cache | Ryzyko |
|---|---|---|---|---|---|---|---|
| `uldk` | przestrzenne | `https://uldk.gugik.gov.pl/?request=GetParcelById&id=<TERYT>&result=geom_wkt,teryt,voivodeship,county,commune,region,parcel&srid=4326` oraz `request=GetParcelByXY&xy=<lon>,<lat>,4326&result=...&srid=4326` | Geometria WKT (EPSG:4326), TERYT, województwo, powiat, gmina, obręb, numer. Powierzchnia i centroid liczone turf-em. Odpowiedź tekstowa: linia 1 = status (`0` ok, `-1 ...` błąd), linia 2 = pola rozdzielone `\|`, geometria z prefiksem `SRID=4326;`. | Dane PZGiK/EGiB GUGiK, udostępniane bezpłatnie (Prawo geodezyjne i kartograficzne) | 8 s, 1 ponowienie | 30 dni | niskie/średnie: usługa bywa wolna; cache po ID i po zaokrąglonym punkcie |
| `meteo` | meteo | `https://archive-api.open-meteo.com/v1/archive?latitude&longitude&start_date=<D−10 lat−75 dni>&end_date=<D>&daily=precipitation_sum,temperature_2m_mean,temperature_2m_max,et0_fao_evapotranspiration&timezone=Europe/Warsaw` (ERA5/ERA5-Land, jedna odpowiedź ok. 3,8 tys. dni). Ostatnie ~5 dni przed dziś archiwum nie ma: dociągamy z `https://api.open-meteo.com/v1/forecast?...&past_days=10&forecast_days=0` (tylko dni ≤ D). | Opad dobowy, temp. średnia/maks., ET0 FAO-56 Penman-Monteith | CC BY 4.0 (Open-Meteo, dane ERA5 Copernicus), użycie niekomercyjne bez klucza | 10 s | dane z D < dziś−7: 365 dni; świeższe: 6 h | niskie: szybkie API; ERA5 to siatka 9–25 km (ograniczenie w raporcie) |
| `sentinel2` | satelita | STAC `POST https://earth-search.aws.element84.com/v1/search` `{collections:["sentinel-2-l2a"], intersects:<poligon>, datetime:"<D−45 dni>/<D>", query:{"eo:cloud_cover":{"lt":70}}, sortby:[{field:"properties.datetime",direction:"desc"}], limit:10}`. Assety COG (`red`, `nir`, `nir08`, `swir16`, `scl`) czytane geotiff.js `fromUrl` tylko w oknie bbox działki (po rzutowaniu proj4 do UTM sceny, `proj:epsg`). | NDVI = (B08−B04)/(B08+B04) w 10 m; NDMI = (B8A−B11)/(B8A+B11) w 20 m; maska SCL: ważne tylko klasy 4 (roślinność) i 5 (gleba odkryta); piksele, których środek leży w poligonie. Skala/offset z `raster:bands` assetu (baseline ≥ 04.00 ma offset −0,1). Bierzemy najnowszą scenę z ≥ 60% ważnych pikseli działki, maks. 3 próby. | Copernicus Sentinel data (wolna licencja Copernicus), katalog Earth Search CC0 | 15 s łącznie | scena D < dziś−7: 365 dni; świeższa: 24 h (cache wyniku statystyk, nie rastrów) | **średnie/wysokie**: odczyt COG z us-west-2 ok. 1–4 s na scenę, chmury, małe działki (< 4 piksele) |
| `soilgrids` | gleba | **REST `rest.isric.org/soilgrids/v2.0/properties/query` jest obecnie wstrzymany przez ISRIC**, więc używamy WCS: `https://maps.isric.org/mapserv?map=/map/<prop>.map&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=<prop>_<depth>_mean&FORMAT=image/tiff&SUBSET=X(x1,x2)&SUBSET=Y(y1,y2)&SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/152160` (zweryfikowane DescribeCoverage: CRS Homolosine EPSG:152160, 250 m). Okno ±250 m wokół centroidu po rzutowaniu proj4 (`+proj=igh +lon_0=0 +datum=WGS84 +units=m`), wynik GeoTIFF czytany geotiff.js. Właściwości `sand`, `clay`, `soc`, głębokości `0-5cm`, `5-15cm`, `15-30cm`, `30-60cm`, `60-100cm` (15 małych żądań równolegle, limit współbieżności 5). | Piasek, ił (g/kg ×10 → %), pył = 100 − piasek − ił, SOC (dg/kg → %), średnie ważone grubością warstw do głębokości korzeni | CC BY 4.0 (ISRIC) | 8 s | 365 dni (klucz: centroid zaokrąglony do 0,0025°) | **wysokie**: usługa ISRIC niestabilna, rozdzielczość 250 m |
| `elevation` | przestrzenne (teren) | `https://api.open-meteo.com/v1/elevation?latitude=<25 wartości>&longitude=<25 wartości>` (Copernicus DEM GLO-90), siatka 5×5 na bbox działki powiększonym o 50 m, jedno żądanie | Wysokość min/maks/średnia, spadek % i kierunek spadku z dopasowania płaszczyzny (najmniejsze kwadraty), najniższy punkt (miejsce na retencję) | Copernicus DEM: licencja ESA/Copernicus (darmowa, z atrybucją); Open-Meteo CC BY 4.0 | 5 s | 365 dni | niskie dostępności, średnie dokładności (90 m wygładza mikrorzeźbę) |
| `eumetsat` | satelita (wilgotność gleby) | EUMETSAT Data Store, REST z OAuth2 (szczegóły w sekcji „Źródło eumetsat”). Produkt: ASCAT surface soil moisture (H SAF / EUMETSAT), kolekcja wstępnie `EO:EUM:DAT:METOP:SOMO25` (**do weryfikacji na żywo**) | Wilgotność warstwy powierzchniowej gleby w % saturacji, najbliższy punkt siatki do centroidu działki, najnowsza obserwacja w oknie D−3…D | Polityka danych EUMETSAT / H SAF (**do potwierdzenia**) | 15 s | 365 dni (klucz: komórka 0,1° + dzień) | **wysokie**: zmiany produktów w 2025 r., format granul, wymagane konto |
| `overpass` | hydrologia | `POST https://overpass-api.de/api/interpreter` (mirror: `https://overpass.private.coffee/api/interpreter`) z `[out:json][timeout:10]; (way["waterway"~"^(river\|stream\|canal\|ditch\|drain)$"](around:1000,<lat>,<lon>); way["natural"="water"](around:1000,...); relation["natural"="water"](around:1000,...); way["landuse"="reservoir"](around:1000,...); way["natural"="wetland"](around:1000,...);); out geom 200;` | Liczba i typy cieków/rowów/zbiorników/mokradeł w 1 km, odległość od granicy działki do najbliższego rowu/cieku i zbiornika (turf), nazwa cieku | ODbL 1.0, „© OpenStreetMap contributors” | 12 s (mirror po 6 s bez odpowiedzi) | 30 dni | średnie: limity Overpass (HTTP 429), niekompletne rowy w OSM |

## Źródło `eumetsat` (decyzja użytkownika: hybryda, 2026-11-21)

Open-Meteo ERA5 **zostaje** źródłem opadu, temperatury, ET0 i 10-letniej klimatologii. EUMETSAT daje tylko dodatkowy, niezależny pomiar satelitarny wilgotności gleby na datę analizy.

- **Konto i sekrety:** darmowe konto EUMETSAT Data Store (EUMETSAT EO Portal). Consumer key i secret z `https://api.eumetsat.int/api-key/` trafiają tylko do `.env` jako `EUMETSAT_CONSUMER_KEY` i `EUMETSAT_CONSUMER_SECRET` (odczyt w `config/env.ts`, opcjonalne). Nigdy w repo, wiadomościach, Discordzie ani w logach. Gdy ich brak, źródło od razu dostaje status `missing` („brak klucza EUMETSAT”) i nie wysyła żadnego żądania.
- **Token (do weryfikacji na żywo):** `POST https://api.eumetsat.int/token` z `grant_type=client_credentials` i Basic auth `key:secret`. Token (ok. 1 h) trzymamy w pamięci procesu i odnawiamy przed wygaśnięciem.
- **Wyszukanie granuli (do weryfikacji na żywo):** `GET https://api.eumetsat.int/data/search-products/1.0.0/os?format=json&pi=<collectionId>&dtstart=<D−3 dni>T00:00:00Z&dtend=<D>T23:59:59Z&geo=<WKT bbox działki powiększony o 0,25°>&c=10&sort=start,time,0`. Bierzemy maks. 2 najnowsze granule (Metop-B i Metop-C), wszystkie z czasem ≤ koniec dnia D.
- **Pobranie (do weryfikacji na żywo):** `GET https://api.eumetsat.int/data/download/1.0.0/collections/<collectionId, URL-encoded>/products/<productId>` (zip z granulą). Jeśli Data Tailor (`https://api.eumetsat.int/epstailor/1.0.0/customisations`) obsługuje ten produkt z wycinkiem ROI i konwersją do netCDF4, używamy go, bo zmniejsza plik. W przeciwnym razie pobieramy całą granulę: segment orbity NRT to rząd kilku MB, czyli 1–4 s na granulę. Data Tailor działa asynchronicznie (kolejka, odpytywanie stanu), więc realnie może nie zmieścić się w 15 s. Na MVP zakładamy pobieranie bezpośrednie, Tailor tylko jeśli test pokaże < 8 s.
- **Odczyt:** tylko format **netCDF4** (HDF5), czytany w Node przez `h5wasm` (WASM z npm, bez narzędzi systemowych). Zip rozpakowujemy w pamięci (`fflate`). BUFR i EPS Native **nie są obsługiwane** (brak dojrzałego czytnika w JS). Jeśli kolekcja ma wyłącznie BUFR, źródło dostaje `missing` i wracamy do tej decyzji przez `decision_request` (alternatywa: Python `eumdac` + `netCDF4`, czyli **nowe narzędzie systemowe i ryzyko**, którego nie dodajemy bez zgody koordynatora).
- **Wynik:** wartość z punktu siatki najbliższego centroidowi (maks. 20 km; dalej `missing`), z czasem obserwacji, id granuli, odległością punktu od centroidu i flagami jakości (odrzucamy piksele z flagą zamarznięcia, śniegu lub niskiej jakości, jeśli produkt je ma). Gdy w zasięgu jest kilka punktów, liczymy średnią ważoną odwrotnością odległości. W cache zapisujemy tylko wynik (kilkadziesiąt bajtów), nie granulę.
- **Budżet:** token ok. 0,5 s, wyszukiwanie ok. 1 s, pobranie 1–2 granul 2–8 s, odczyt h5wasm < 1 s. Razem 4–10 s, timeout 15 s, równolegle z innymi źródłami.
- **Ryzyka do weryfikacji na żywo w pierwszym zadaniu backendu (timebox 30 min):**
  1. Status `SOMO25`: według H SAF łańcuch NRT EUMETSAT wyłączono 14.07.2025 i zastąpiono łańcuchem H SAF, a produkty 25 km (H103/H105) mają zastąpić produkty 6,25 km (H122). Trzeba sprawdzić w Data Store (`eumdac search` albo zapytanie do `search-products`), która kolekcja ASCAT SSM ma dane dla dat przed i po 07.2025 (np. SOMO25/SOMO12 dla archiwum i następca H SAF dla dat bieżących). Możliwe, że potrzebne będą 2 kolekcje zależnie od daty D.
  2. Format granul w wybranej kolekcji (netCDF4 czy tylko BUFR).
  3. Czy produkty H SAF są w Data Store. Jeśli nie, alternatywą jest serwer FTP H SAF, ale to osobna rejestracja i inny protokół, poza MVP.
  4. LSA SAF ET (DMET, MSG, 3 km): opcjonalnie. Najpierw sprawdzić, czy jest w Data Store (`eumdac search`); jeśli nie, pomijamy (LSA SAF ma własny serwer z osobną rejestracją). ET0 pozostaje z Open-Meteo.
- **Licencja:** dane EUMETSAT i SAF są bezpłatne dla użytkowników po rejestracji, z obowiązkiem atrybucji „© EUMETSAT” / „EUMETSAT H SAF”. **Dokładne warunki (polityka danych EUMETSAT, kategoria danych produktu, zgoda na redystrybucję wartości w raporcie) do potwierdzenia** przed wpisem do README.
- **Plan B:** brak klucza, błąd tokenu, brak granuli w oknie D−3…D, nieobsługiwany format albo timeout oznaczają status `missing`/`error`/`timeout`, wpis w `dataGaps` („Brak satelitarnej wilgotności gleby EUMETSAT”) i niższą pewność (ADR-007 §10). Ocena idzie dalej na KBW, glebie i NDMI.

Odrzucone na MVP: Copernicus Data Space Statistical API (wymaga konta OAuth), IMGW danepubliczne (stacje, nie siatka; trudna interpolacja na działkę), Geoportal NMT WCS 1 m (EPSG:2180, duże odpowiedzi; dopiero jako should zamiast `elevation`), MPHP/ISOK (ciężkie WMS/WFS; should jako uzupełnienie Overpass), IUNG/EDO (should, tło porównawcze, nie wejście obliczeń).

## Decyzja: budżet czasu (≤ 30 s)

1. Krok 2 (API-001/002) zapisuje działkę w cache, więc w API-004 ULDK to zwykle odczyt z Mongo (< 100 ms).
2. Pozostałe 6 źródeł (z `eumetsat`) startuje równolegle (`Promise.allSettled`), każde z własnym `AbortSignal.timeout` z tabeli. Twardy limit całej analizy: 25 s; po nim niedokończone źródła dostają status `timeout`.
3. Przed każdym wywołaniem: odczyt `source_cache` po kluczu (DM-002). Wynik źródła zapisujemy już przetworzony (statystyki, nie rastry ani surowy JSON Overpass), żeby M0 512 MB wystarczyło.
4. Obliczenia (ADR-007) to czyste funkcje, < 300 ms. Zapis raportu (DM-001) i odpowiedź 201.
5. Przed finałem: rozgrzanie cache dla działek demo (wywołanie API-004 dla każdej), bez seeda w bazie dev.

Postęp w kroku 3: API-004 jest jednym żądaniem. Frontend pokazuje listę źródeł z API-006 ze stanem „pobieranie” i po odpowiedzi podstawia rzeczywiste statusy z `report.sources[]` (ok / z cache / brak danych / przekroczony czas). Bez SSE i websocketów.

## Decyzja: awaria źródła = jawny brak danych

Źródło, które zwróci błąd, timeout albo puste dane, dostaje w `sources[]` status `error`/`timeout`/`missing` z komunikatem, a w `dataGaps[]` opis, czego brakuje i na co to wpływa. Silnik nie podstawia wartości domyślnych udających pomiar: zależne wskaźniki mają `null`, reguły wymagające tych danych się nie uruchamiają, pewność spada (ADR-007). Jedynie brak geometrii działki (ULDK bez cache) przerywa analizę błędem 502 `UPSTREAM_UNAVAILABLE`.

## Plan B dla źródeł ryzykownych

- `sentinel2`: (1) gdy brak sceny ≥ 60% ważnych pikseli w 45 dniach: `missing` z datą ostatniej sceny ze STAC i jej zachmurzeniem; (2) gdy odczyt COG nie mieści się w 15 s: liczymy tylko NDVI (2 assety + SCL zamiast 4), (3) ostatecznie ocena z meteo i gleby, pewność obniżona. Dla dat sprzed dostępności L2A w Earth Search (ok. 2017 r.): `missing` z informacją o zakresie archiwum.
- `soilgrids`: (1) WCS jako podstawa, (2) jeśli ISRIC przywróci REST, można przełączyć na jedno żądanie `properties/query`, (3) przy braku: retencja gleby „brak danych”, przyczyna „niska retencja gleby” i reguły glebowe się nie uruchamiają, deficyt glebowy liczony nie jest (zostaje sam KBW), pewność obniżona.
- `overpass`: mirror, potem `missing` (rekomendacje krajobrazowe zależne od cieków się nie pojawiają, zostaje reguła oparta na spadku).
- `elevation`: przy błędzie `missing`; reguły spadku się nie uruchamiają.

## Do sprawdzenia w pierwszym zadaniu backendu (maks. 15 min)

- Kolejność osi w `GetParcelByXY` dla `srid 4326` (zakładamy `lon,lat,4326`; test na znanym punkcie, np. centrum Puław).
- Dokładne opóźnienie archiwum Open-Meteo dla dat bliskich dziś i zgodność jednostek ET0 (mm/dzień).
- Nazwy assetów i `raster:bands` (scale/offset) w aktualnych itemach `sentinel-2-l2a` Earth Search.
- Odpowiedź `GetCoverage` SoilGrids dla małego okna w EPSG:152160 (format, wartości no-data).
- `eumetsat`: token, ID kolekcji ASCAT SSM dla dat przed i po 07.2025, format granul (netCDF4/BUFR), odczyt h5wasm, czas Data Tailor (patrz sekcja „Źródło eumetsat”).

## Konsekwencje

- README sekcje 4, 5 i 7 (źródła, dane na żywo vs. przetworzone, licencje) budujemy z katalogu DM-005 (`GET /sources`, API-006), więc dokumentacja i aplikacja nie rozjadą się.
- Wszystkie dane pobierane na żywo w chwili analizy; jedyną „wcześniej przetworzoną” rzeczą są tabele Kc/NDVI upraw w kodzie (z FAO-56) i cache odpowiedzi.
