# ADR-007: Metodyka obliczeń i reguły rekomendacji

- Status: accepted
- Data: 2026-11-21
- Autor: coord-architect
- Powiązane: ADR-006, `contracts/data_model.json` (DM-001, DM-004, DM-006…DM-014), `contracts/api.json` (API-004)
- Kod: `apps/backend/src/services/engine/*.ts` (czyste funkcje, testy Vitest), wersja metodyki w raporcie: `methodologyVersion = "kropla-1.0"`

## Kontekst

KOWR wymaga, żeby wynik i rekomendacje liczyła aplikacja z pobranych danych, w kolejności: ocena stanu wody (10 lat) → przyczyny → retencja → agrotechnika → ewentualne nawadnianie, z odróżnieniem suszy bieżącej od wieloletniej podatności i z jawną niepewnością. Bibliografia zadania: FAO-56 (Kc, ET), KBW IUNG-PIB (okresy 60-dniowe), NWRM (retencja krajobrazowa).

## Decyzja

### 1. Dane wejściowe i odcięcie w czasie
D = data analizy (dziś lub dowolna z ostatnich 10 lat). Używamy wyłącznie danych z dni ≤ D. Okno pobrania meteo: od D − 10 lat − 75 dni do D.

### 2. Zapotrzebowanie wodne uprawy (FAO-56, single crop coefficient)
- `ETc = ET0 · Kc` dziennie; ET0 = `et0_fao_evapotranspiration` z Open-Meteo (Penman-Monteith FAO-56).
- Tabela upraw w kodzie (`engine/crops.ts`, DM-004) z FAO-56 Tab. 12 i kalendarzem faz dla Polski. Kc w fazie początkowej stały, w rozwoju liniowo do Kc mid, w środkowej stały, w końcowej liniowo do Kc end; poza sezonem Kc = 0,3 (gleba odkryta/spoczynek).

| code | Uprawa | Kc ini / mid / end | Zr [m] | p | Fazy krytyczne (wrażliwe na niedobór) |
|---|---|---|---|---|---|
| `winter_wheat` | pszenica ozima | 0,4 / 1,15 / 0,3 | 1,2 | 0,55 | strzelanie w źdźbło – kłoszenie – kwitnienie (V–VI) |
| `spring_barley` | jęczmień jary | 0,3 / 1,15 / 0,25 | 1,0 | 0,55 | strzelanie w źdźbło – kłoszenie (V–VI) |
| `maize` | kukurydza na ziarno | 0,3 / 1,2 / 0,6 | 1,2 | 0,55 | wiechowanie – kwitnienie – nalewanie (VII–VIII) |
| `potato` | ziemniak | 0,5 / 1,15 / 0,75 | 0,5 | 0,35 | zawiązywanie i przyrost bulw (VI–VIII) |
| `winter_rapeseed` | rzepak ozimy | 0,35 / 1,1 / 0,35 | 1,2 | 0,6 | pąkowanie – kwitnienie (IV–V) |
| `sugar_beet` | burak cukrowy | 0,35 / 1,2 / 0,7 | 0,9 | 0,55 | zwarcie rzędów – przyrost korzeni (VII–VIII) |
| `grassland` | użytki zielone | 0,4 / 1,0 / 0,85 | 0,6 | 0,6 | odrost po pokosach (V–VIII) |

### 3. Klimatyczny bilans wodny (KBW) i ocena bieżąca
- `KBW_n = Σ (P − ETc)` za n = 30 i 60 dni kończących się w D (60 dni zgodnie z IUNG).
- Rozkład odniesienia: dla każdego z 10 lat przed rokiem D liczymy KBW_n dla okien kończących się w dniach D−15, D−10, …, D+15 tego roku (7 okien × 10 lat = 70 próbek; wszystkie przed D). Norma = mediana, anomalia = KBW_n − mediana, percentyl = odsetek próbek ≤ KBW_n.
- Kompletność: okno z > 10% brakujących dni = `null` (brak danych), nie interpolujemy.

### 4. Gleba: pojemność wodna (Saxton i Rawls 2006)
Dla każdej warstwy SoilGrids: S, C jako ułamki (piasek, ił), OM = SOC[%] · 1,724 (maks. 8%).
- θ1500t = −0,024S + 0,487C + 0,006OM + 0,005·S·OM − 0,013·C·OM + 0,068·S·C + 0,031; θ1500 = θ1500t + (0,14·θ1500t − 0,02)
- θ33t = −0,251S + 0,195C + 0,011OM + 0,006·S·OM − 0,027·C·OM + 0,452·S·C + 0,299; θ33 = θ33t + (1,283·θ33t² − 0,374·θ33t − 0,015)
- TAW [mm] = Σ_warstw 1000 · (θ33 − θ1500) · grubość [m] do głębokości Zr uprawy (maks. 1 m); RAW = p · TAW.
- Kategoria glebowa (przybliżenie kategorii agronomicznych): piasek ≥ 80% bardzo lekka, 65–80% lekka, 35–65% średnia, < 35% ciężka.
- Deficyt glebowy Dr (FAO-56, bilans „wiadra”): start Dr = 0 (pojemność polowa) 1 marca roku D, dalej Dr_i = clamp(Dr_{i−1} − P_i + ETc_i, 0, TAW). Liczony tylko gdy jest gleba i meteo; poza III–X `null`.

### 5. Satelita interpretowany przez uprawę
- NDVI i NDMI (mediana pikseli działki) z najnowszej ważnej sceny ≤ D (ADR-006), z datą i wiekiem sceny.
- Tabela oczekiwanych zakresów NDVI/NDMI per uprawa i miesiąc w `engine/crops.ts` (np. pszenica ozima V: NDVI 0,6–0,9; kukurydza IV–V: gleba odkryta, niski NDVI jest normalny). Ocena: `below` / `normal` / `above` / `unknown`.
- Satelita nie zmienia klasy suszy sam: potwierdza lub osłabia ocenę meteo-glebową (wpływ na pewność) i może dodać przyczynę „niska wilgotność roślinności”.

### 5a. Satelitarna wilgotność gleby ASCAT (EUMETSAT, źródło `eumetsat`)
- Wartość SSM w % saturacji warstwy powierzchniowej (kilka cm) z najnowszej obserwacji w oknie D−3…D (ADR-006), rozdzielczość 12,5–25 km zależnie od produktu.
- Ocena orientacyjna: `dry` przy SSM ≤ 30%, `wet` przy SSM ≥ 70%, w pozostałych przypadkach `normal`; `unknown`, gdy brak wartości albo flaga zamarznięcia lub śniegu. Progi są w kodzie jako stałe z komentarzem; MVP nie ma klimatologii SSM, więc nie liczymy anomalii.
- **Bez samodzielnej interpretacji:** SSM nie ustala ani nie zmienia klasy suszy (§6). Wpływa tylko na pewność (§10) i na zdanie podsumowania, np. „pomiar satelitarny wilgotności gleby to potwierdza” albo „…wskazuje wilgotniejszą powierzchnię, wynik mniej pewny”.
- Zgodność z oceną: przy klasie `moderate`/`severe` SSM `dry` potwierdza ocenę, a `wet` jej przeczy. Przy klasie `none` SSM `wet` lub `normal` potwierdza ocenę, a `dry` jej przeczy. Gdy NDMI (§5) i SSM wskazują ten sam kierunek, oba trafiają do `evidence[]` oceny.
- Ograniczenie w raporcie: ASCAT mierzy tylko kilka centymetrów powierzchni (szybko reaguje na pojedynczy deszcz i nie opisuje strefy korzeni), piksel 12,5–25 km obejmuje wiele działek, pomiar nie działa na zamarzniętej glebie i pod śniegiem.

### 6. Klasa suszy bieżącej
- `severe` (silna): percentyl KBW60 ≤ 10 albo (Dr > RAW i percentyl KBW60 ≤ 30).
- `moderate` (umiarkowana): percentyl KBW60 ≤ 30 albo Dr > RAW.
- `none` (brak): w pozostałych przypadkach.
- `unknown`: brak KBW60. Poza sezonem (XI–II) klasa ma dopisek „poza okresem wegetacji, ocena orientacyjna”.

### 7. Podatność wieloletnia (10 sezonów przed rokiem D)
- KBW miesięczny w IV–IX każdego roku. Miesiąc deficytowy: KBW_m < −25 mm.
- Sezon z deficytem: min. 60-dniowego KBW w IV–IX < −RAW (gdy brak gleby: < −60 mm, z adnotacją w `dataGaps`).
- Miesiące krytyczne: miesiące deficytowe w ≥ 50% lat (ciągły zakres opisany słownie, np. „maj–lipiec”).
- Klasa: `low` 0–2 sezony, `medium` 3–5, `high` ≥ 6; `unknown` gdy < 8 lat kompletnych.

### 8. Przyczyny (każda z `evidence[]`)
| code | Warunek | Dowód |
|---|---|---|
| `precip_deficit_heat` | KBW60 percentyl ≤ 30 i (średnia Tmax 30 dni > norma + 1 °C albo opad 60 dni < 70% normy) | opad, norma, Tmax, ETc |
| `low_soil_retention` | TAW < 100 mm albo piasek ≥ 65% | piasek %, SOC %, TAW mm |
| `surface_runoff` | spadek ≥ 2% | spadek %, kierunek, różnica wysokości |
| `crop_water_demand` | data D w fazie krytycznej uprawy albo ETc 30 dni > opad 30 dni | Kc, ETc, faza |
| `low_vegetation_moisture` | NDMI `below` dla uprawy i miesiąca | NDMI, data sceny, oczekiwany zakres |

### 9. Rekomendacje (stała kolejność kategorii)
Generowane tylko, gdy klasa suszy lub podatność ≠ `unknown`. Każda ma `evidence[]` (min. 1 wartość ze źródłem i datą) i `why` z liczbami.

1. **Retencja krajobrazowa** (`retention_landscape`)
   - `R-LAND-01` zastawka/spowolnienie odpływu w rowie: rów lub ciek ≤ 300 m od działki i podatność ≥ medium. Miejsce: najbliższy odcinek rowu.
   - `R-LAND-02` strefa buforowa / pas zadrzewień w dolnej części działki: spadek ≥ 2%. Miejsce: krawędź w kierunku spadku.
   - `R-LAND-03` oczko lub mały zbiornik w najniższym miejscu: brak zbiornika w 1 km, powierzchnia ≥ 1 ha, spadek ≥ 1%. Miejsce: najniższy punkt siatki wysokości.
2. **Retencja glebowa** (`retention_soil`)
   - `R-SOIL-01` zwiększanie materii organicznej (obornik, kompost, przyorywanie słomy): SOC < 1,5% albo TAW < 100 mm.
   - `R-SOIL-02` międzyplony po zbiorze: podatność ≥ medium i uprawa zbierana latem (zboża, rzepak, ziemniak).
3. **Agrotechnika** (`agrotechnics`)
   - `R-AGRO-01` resztki pożniwne i mulcz zamiast odkrytej gleby: klasa ≥ moderate albo gleba lekka.
   - `R-AGRO-02` uprawa uproszczona / ograniczenie głębokiej orki przed siewem: gleba lekka/bardzo lekka i podatność ≥ medium.
   - `R-AGRO-03` uprawa w poprzek stoku: spadek ≥ 3%.
   - `R-AGRO-04` monitoring w miesiącach krytycznych: zawsze, gdy są miesiące krytyczne.
4. **Nawadnianie** (`irrigation`, zawsze jeden element z oceną zasadności)
   - Zasadne, gdy klasa ∈ {moderate, severe}, Dr > RAW, D w fazie krytycznej i miesiąc IV–IX.
   - Dawka netto = min(Dr, RAW) mm, brutto = netto / 0,75 (deszczownia), m³/ha = mm · 10. Okno: najbliższe 3–5 dni, rano lub wieczorem; kolejna kontrola za ≈ RAW / średnie ETc z 7 dni.
   - Gdy niezasadne: `isJustified = false` i `why` z liczbami (np. „deficyt glebowy 18 mm < próg 52 mm”).
   - Adnotacja: pobór wody powyżej 5 m³/dobę wymaga zgody wodnoprawnej (Prawo wodne).

### 10. Pewność
- Wynik = suma wag dostępnych źródeł: meteo 0,35, gleba 0,20, Sentinel-2 0,15, EUMETSAT SSM 0,10, teren 0,10, hydrologia 0,05, działka 0,05 (razem 1,0).
- Kary: scena Sentinel-2 starsza niż 20 dni −0,05; NDMI sprzeczny z meteo (`normal`/`above` przy klasie severe albo `below` przy none) −0,10; SSM sprzeczny z klasą (§5a) −0,10; SSM i NDMI jednocześnie sprzeczne z klasą: dodatkowe −0,05 i adnotacja „dane satelitarne nie potwierdzają bilansu”; działka < 0,5 ha −0,05; poza sezonem −0,10.
- Premia: SSM i NDMI zgodne z klasą +0,05 (maks. do 1,0).
- `high` ≥ 0,80, `medium` ≥ 0,55, `low` poniżej. Każda kara trafia do `confidenceReasons[]`.

### 11. Ograniczenia stałe w raporcie
ERA5 siatka ok. 9–25 km (opad lokalny może się różnić), ASCAT 12,5–25 km i tylko warstwa powierzchniowa, SoilGrids 250 m (model, nie pomiar na działce), DEM 90 m, chmury i rozdzielczość Sentinel-2 (10–20 m), kompletność rowów w OSM, rozkład odniesienia z 10 lat (krótki szereg), brak prognozy pogody, brak danych o zabiegach i nawadnianiu na działce.

## Uzasadnienie

FAO-56 i KBW IUNG to metody wskazane w bibliografii zadania, a jawne progi w tabelach dają jury możliwość weryfikacji każdej liczby. Percentyl z 70 próbek (okna ±15 dni) wygładza 10-letni szereg bez sięgania po dane spoza zakresu.

## Konsekwencje

- Silnik i progi są w kodzie jako stałe z komentarzem źródła; zmiana progu = zmiana `methodologyVersion`.
- Testy Vitest dla: KBW i percentyla (zbiór syntetyczny), Saxton-Rawls (przykład piasek 85%/ił 5%/OM 1% → θ33 ≈ 0,087, θ1500 ≈ 0,034, TAW ≈ 53 mm na 1 m), klasy suszy, reguł R-*.
- README sekcja 9 (weryfikacja) opisuje porównanie z KBW IUNG i EDO dla działek demo.
