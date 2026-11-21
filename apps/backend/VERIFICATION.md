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

Plan: miesięczny opad NASA POWER (`PRECTOTCORR`, punkt 51,44 N / 21,93 E, fixture w `src/services/sources/__fixtures__/`) wobec miesięcznych sum opadu IMGW (stacja Puławy lub Lublin-Radawiec, archiwum `danepubliczne.imgw.pl`).

| Stacja IMGW | Miesiąc | NASA [mm] | IMGW [mm] | Różnica [mm / %] |
|---|---|---|---|---|
| nie wykonano | | | | |

Status: porównanie nie zostało jeszcze policzone (pobranie archiwum IMGW zostało zablokowane przez uprawnienia sesji; Open-Meteo zwraca 429). Do uzupełnienia po pobraniu `…/miesieczne/klimat/2024/2024_m_k.zip`. Archiwum miesięczne IMGW kończy się na 2024, więc porównanie obejmie miesiące IV–IX 2024.

Ograniczenia takiego porównania: NASA POWER to siatka ok. 50 km (MERRA-2) z korektą opadu, a IMGW to pomiar punktowy, więc lokalne burze mogą dać duże różnice miesięczne (kilkadziesiąt %). Zgodność trendu (miesiące suche i mokre) jest ważniejsza niż zgodność co do milimetra.

## 3. Odwołania

FAO-56: Allen R.G. i in. (1998), Crop evapotranspiration, FAO Irrigation and Drainage Paper 56. Saxton K.E., Rawls W.J. (2006), SSSAJ 70:1569–1578. Metodyka: `docs/adr/ADR-007-methodology.md`. Źródła danych bieżących i klimatologii: `docs/adr/ADR-009-current-vs-climatology-sources.md`.
