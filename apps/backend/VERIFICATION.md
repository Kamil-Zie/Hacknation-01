# Sposób weryfikacji

Wyniki silnika (KBW, klasa suszy, podatność, pewność) sprawdzamy na trzy sposoby.

## 1. Testy kontrolne z wartościami policzonymi ręcznie

Plik `src/services/engine/__control__/control.test.ts` (uruchomienie: `npm test -w @kropla/backend`). Każdy przypadek ma w komentarzu rachunek krok po kroku:

- **KBW** (FAO-56, Allen i in. 1998: ETc = Kc · ET0, KBW = Σ(P − ETc)): 10-dniowa seria z dwoma wartościami Kc daje −32,2 mm. Percentyl, norma i anomalia: zbiór odniesienia z 70 próbek o znanych rangach (oczekiwane: percentyl 50, norma −330 mm, anomalia 0).
- **Gleba** (Saxton i Rawls 2006, Soil Sci. Soc. Am. J. 70:1569–1578, równania 1–2): θ33 i θ1500 dla piasku gliniastego 85/5/OM 1% (przykład z ADR-007: 0,087 i 0,034), piaszczysto-gliniastej 60/13/OM 1,5% (jak Bronowice) i gliny 30/35/OM 2%. Wynik porównany z typowymi zakresami klas teksturalnych USDA (tolerancja ±0,02 m³/m³). TAW/RAW dla pszenicy ozimej (Zr 1,2 m, ograniczone do 1 m, p = 0,55): 101,9 / 56,1 mm.
- **Klasa suszy** (ADR-007 §6): granice percentyla 10/11 i 30/31 oraz warunek Dr > RAW (także Dr = RAW).
- **Podatność** (ADR-007 §7): 0, 2, 3, 5 i 6 sezonów z deficytem (low/medium/high), miesiące krytyczne, próg −60 mm bez gleby, „brak danych” przy < 8 latach.
- **Pewność** (ADR-007 §10, ADR-008): suma wag 1,00; progi 0,55 i 0,80; kara za zapas NASA −0,05; komplet kar (0,50) i premia za zgodność satelity (+0,05).

## 2. Porównanie z niezależnym źródłem

Miesięczny opad NASA POWER (`PRECTOTCORR`, punkt działki demo 51,44 N / 21,93 E, fixture w `src/services/sources/__fixtures__/`) wobec miesięcznych sum opadu IMGW ze stacji synoptycznej **Lublin-Radawiec** (ok. 45 km od działki; archiwum `danepubliczne.imgw.pl`, `miesieczne/synop`, pliki 2023 i 2024; w Puławach nie ma stacji w archiwum miesięcznym). Okres: sezon wegetacyjny IV–IX 2023 oraz IV–VI 2024 (IMGW opublikowało 2024 tylko do czerwca).

| Miesiąc | NASA [mm] | IMGW [mm] | Różnica [mm / %] |
|---|---|---|---|
| 2023-04 | 58,1 | 62,5 | −4,4 / −7% |
| 2023-05 | 76,8 | 71,6 | +5,2 / +7% |
| 2023-06 | 46,3 | 38,4 | +7,9 / +21% |
| 2023-07 | 98,4 | 87,7 | +10,7 / +12% |
| 2023-08 | 65,0 | 68,6 | −3,6 / −5% |
| 2023-09 | 31,1 | 33,2 | −2,1 / −6% |
| **IV–IX 2023** | **375,7** | **362,0** | **+13,7 / +4%** |
| 2024-04 | 38,7 | 22,9 | +15,8 / +69% |
| 2024-05 | 25,8 | 17,1 | +8,7 / +51% |
| 2024-06 | 78,3 | 95,5 | −17,2 / −18% |
| **IV–VI 2024** | **142,8** | **135,5** | **+7,3 / +5%** |

Wynik: suma sezonowa zgadza się z dokładnością 4–5%, a NASA POWER poprawnie oddaje miesiące suche i mokre (np. bardzo suchy IV–V 2024). Duże różnice procentowe w miesiącach suchych wynikają z małych sum (kilkanaście mm). KBW i percentyl liczymy na sumach 30–60 dni z 10 lat w całości na NASA (ADR-009), więc taki rozrzut miesięczny ma ograniczony wpływ na klasę suszy.

Ograniczenia takiego porównania: NASA POWER to siatka ok. 50 km (MERRA-2) z korektą opadu, a IMGW to pomiar punktowy, więc lokalne burze mogą dać duże różnice miesięczne (kilkadziesiąt %). Zgodność trendu (miesiące suche i mokre) jest ważniejsza niż zgodność co do milimetra.

## 3. Odwołania

FAO-56: Allen R.G. i in. (1998), Crop evapotranspiration, FAO Irrigation and Drainage Paper 56. Saxton K.E., Rawls W.J. (2006), SSSAJ 70:1569–1578. Metodyka: `docs/adr/ADR-007-methodology.md`. Źródła danych bieżących i klimatologii: `docs/adr/ADR-009-current-vs-climatology-sources.md`.
