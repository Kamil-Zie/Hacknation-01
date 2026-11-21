# ADR-005: Stack aplikacji Kropla

- Status: accepted
- Data: 2026-11-21
- Autor: coord-architect
- Powiązane: `project.json → technologies.*.choice`, ADR-004 (stack dobierany do projektu), ADR-006, ADR-007

## Kontekst

Aplikacja webowa bez logowania: rolnik wskazuje działkę (ID TERYT lub mapa), wybiera uprawę i datę, backend pobiera na żywo dane z 5 kategorii i liczy raport w ≤ 30 s, raport można wydrukować lub zapisać do PDF. Zespół zna JS/TS, mamy ok. 13 h pracy czterech osób. Koncepcja nie wymusza SSR, aplikacji mobilnej ani realtime, wymusza za to mapę, geometrię/rzutowanie i odczyt rastrów satelitarnych.

## Decyzja

Bierzemy `recommended_default` i dokładamy tylko biblioteki wymagane przez domenę.

| Obszar | Wybór |
|---|---|
| Frontend | React 18 + TypeScript + Vite, MUI, Zustand + TanStack Query, React Hook Form + Zod, react-router-dom |
| Mapa | Leaflet + react-leaflet, podkład OSM (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`, atrybucja ODbL), opcjonalnie WMS ortofotomapy Geoportal (`https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution`) |
| Wykres KBW (should) | MUI X Charts (`@mui/x-charts`), ta sama rodzina co MUI |
| PDF / druk | Trasa `/report/:id/print` z CSS `@media print` + `window.print()`. Użytkownik wybiera „Zapisz jako PDF” w oknie druku (Chrome, Edge, Firefox, Safari, Opera). Bez biblioteki PDF. |
| Backend | Node 20+ + TypeScript + Express + Zod, wbudowany `fetch` z `AbortSignal.timeout` |
| Geometria | `@turf/turf` (area, centroid, bbox, booleanPointInPolygon, pointToLineDistance), `proj4` (EPSG:4326 ↔ 2180 ↔ UTM 326xx), `wellknown` (WKT → GeoJSON) |
| Raster | `geotiff` (geotiff.js): odczyt okna bbox z COG Sentinel-2 przez HTTP range |
| Baza | MongoDB Atlas M0 + Mongoose; kolekcje `reports` i `source_cache` (TTL) |
| Auth | brak (wont: konta i dane osobowe); raport otwierany po id |
| Testy | Vitest (silnik obliczeń), React Testing Library (sekcje raportu) |
| Pakiety | npm workspaces |

## Uzasadnienie

Domyślny stack daje najszybszy start i wygląd MUI bez projektowania od zera, a Leaflet jest najlżejszą drogą do mapy z poligonem działki i kliknięciem. Druk przeglądarkowy daje PDF w każdej przeglądarce bez ryzyka bibliotek typu jsPDF/html2canvas (mapa Leaflet w canvasie, fonty PL), a turf/proj4/geotiff to jedyne sprawdzone w JS narzędzia do geometrii i COG, więc cały silnik zostaje w TypeScript.

## Konsekwencje

- Struktura backendu według `docs/coding-standard.md`, z jednym dodatkiem: `services/sources/<source>.source.ts` (jeden plik na źródło: fetch + parsowanie + cache) i `services/engine/*.ts` (czyste funkcje: KBW, percentyle, Saxton-Rawls, klasy, reguły). Koordynator powinien dopisać ten wzorzec do `docs/coding-standard.md` (architekt nie ma tam prawa zapisu w tym zadaniu).
- Frontend: Leaflet wymaga importu `leaflet/dist/leaflet.css` i poprawki ikon markerów w Vite; mapa w widoku druku jako zwykły `MapContainer` z `preferCanvas=false` i stałą wysokością (kafle OSM drukują się jako obrazy).
- Infrastruktura bez zmian (dev lokalnie + Atlas, prod Synology + Cloudflare). Backend potrzebuje wyjścia HTTPS do: uldk.gugik.gov.pl, archive-api.open-meteo.com, api.open-meteo.com, earth-search.aws.element84.com, sentinel-cogs.s3.us-west-2.amazonaws.com, rest.isric.org, overpass-api.de (+ mirror). Port 443 out jest już otwarty na Synology.
- Narzędzia: tylko node ≥ 20.19 i npm ≥ 10 (istniejąca reguła `tooling.stack_rules`), bez nowych narzędzi systemowych.
