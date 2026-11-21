# Kropelka: treść slajdów (maks. 10, do złożenia w PDF)

Liczby pochodzą z README.md. Czego w README nie ma, oznaczono [DO UZUPEŁNIENIA]. Kryteria KOWR: wartość praktyczna 25%, dane i wiarygodność 25%, innowacyjność 20%, prostota 15%, prototyp 15%.

---

## Slajd 1. Tytuł

- **Kropelka: zatrzymaj wodę, chroń plony**
- Zadanie KOWR „Zatrzymaj wodę, chroń plony”
- Zespół HackNation
- Prototyp: https://app.kamil-zielinski.pl

**Grafika:** logo/kropla z Design Systemu, tło: zrzut mapy z obrysem działki.

**Notatka:** Przedstawiamy się i podajemy jedno zdanie: rolnik wpisuje numer działki, a po kilkunastu sekundach dostaje raport, co robić z wodą. Wynik liczy aplikacja z danych, nie model AI.

---

## Slajd 2. Problem rolnika

- Susza uderza w plony, a decyzje trzeba podjąć teraz
- Dane są rozproszone: pogoda, satelita, gleba, wody
- Rolnik nie ma czasu ani narzędzi, żeby je złożyć
- Gotowe porady „z szablonu” nie znają jego działki

**Grafika:** ikony 5 kategorii danych rozsypane, jedna działka w środku z pytaniem „co robić?”.

**Notatka:** Rolnik widzi suszę, ale nie wie, czy to jego działka jest zagrożona i co zrobić najpierw. Dane istnieją, tylko nikt ich dla niego nie łączy. [DO UZUPEŁNIENIA: liczba lub statystyka strat suszowych, jeśli zespół chce ją podać z cytowanym źródłem.]

---

## Slajd 3. Rozwiązanie w 3 krokach

- **1. Działka:** numer ewidencyjny albo klik na mapie
- **2. Uprawa i data analizy**
- **3. Raport:** stan, przyczyny, rekomendacje
- Wynik w ok. 8–20 s, z cache ok. 0,3 s

**Grafika:** trzy zrzuty obok siebie (wybór działki z mapą, wybór uprawy i daty, raport) w układzie telefonu 390 px.

**Notatka:** Trzy kroki, bez logowania. Uprawa: pszenica ozima, jęczmień jary, kukurydza, ziemniak, rzepak ozimy, burak cukrowy, użytki zielone. Data: dziś albo dowolna z ostatnich 10 lat.

---

## Slajd 4. Demo: raport

- **Stan:** wilgotność strefy korzeniowej 64% wobec normy 71% (percentyl 3, „sucho”)
- **Przyczyny** z liczbami (deficyt opadów, retencja gleby, spływ, wskaźniki satelitarne)
- **Rekomendacje w stałej kolejności:** retencja → agrotechnika → nawadnianie (opcjonalnie)
- Każda z uzasadnieniem w danych

**Grafika:** zrzut: raport Bronowice (061409_2.0009.612, pszenica ozima, 2026-05-25), karta „Stan wody”, potem karty „Przyczyny” i „Rekomendacje”.

**Notatka:** Tu pokazujemy na żywo działkę od jury. Zwracamy uwagę, że nawadnianie jest na końcu, bo najpierw zatrzymujemy wodę tam, gdzie spada (zasada NWRM). Kryterium: wartość praktyczna.

---

## Slajd 5. Dane z 5 kategorii: na żywo i 10 lat

- **Meteo, satelita, gleba, hydrologia, przestrzenne**
- Pobierane **na żywo** w chwili analizy (ULDK, Open-Meteo, NASA POWER, Sentinel-2, SoilGrids, DEM, OSM)
- **10 lat** tła z NASA POWER: percentyl, anomalia, podatność
- Status każdego źródła w raporcie: ok / z cache / brak danych / przekroczony czas
- Wszystkie źródła bezpłatne, bez kluczy

**Grafika:** tabela 5 kategorii ze źródłem i rozdzielczością (z README §4), zrzut sekcji „Źródła” z raportu.

**Notatka:** Jedyne dane przetworzone wcześniej to tabele współczynników upraw z FAO-56. Nie ma gotowych wyników ani rekomendacji. Kryterium: wykorzystanie danych.

---

## Slajd 6. Metodyka naukowa

- **FAO-56 Penman-Monteith:** ET0, ETc = ET0 · Kc
- **KBW IUNG-PIB:** klimatyczny bilans wodny w oknach 30 i 60 dni
- **Saxton i Rawls (2006):** pojemność wodna gleby
- **NWRM (Komisja Europejska):** kolejność retencja → agrotechnika → nawadnianie
- Progi jawne w kodzie i w ADR-007

**Grafika:** schemat: dane → bilans wodny → klasa suszy → reguły rekomendacji (R-LAND, R-SOIL, R-AGRO, nawadnianie).

**Notatka:** Każda liczba w raporcie ma dowód z źródłem i datą, a raport podaje wersję metodyki. Testy automatyczne obejmują m.in. ET0 Penman-Monteith na przykładzie z FAO-56. Ta sama działka, uprawa i data dają ten sam wynik.

---

## Slajd 7. Wiarygodność i niepewność

- **Porównanie z IUNG-PIB:** 6 działek, 2 okresy = 12 porównań
- **6 zgodnych, 3 częściowo, 3 niezgodne** (fałszywe alarmy)
- Co zrobiliśmy: na danych zapasowych NASA `severe` tylko przy percentylu ≤ 10 (ADR-007)
- Raport podaje pewność (wysoka / średnia / niska), braki danych mówimy wprost

**Grafika:** wykres słupkowy 6 / 3 / 3 albo uproszczona tabela z README §9; obok zrzut „Pewność i ograniczenia” z raportu.

**Notatka:** Próba jest mała, to sprawdzenie kierunku, nie walidacja statystyczna. Zgadzamy się z IUNG przy rozległej suszy i przy jej braku. Wszystkie 3 niezgodności to fałszywe alarmy, więc zaostrzyliśmy regułę. Porównanie na danych ERA5 jeszcze powtórzymy: [DO UZUPEŁNIENIA: wynik po powtórzeniu na ERA5, jeśli zdążymy].

---

## Slajd 8. Prostota i dostęp

- Telefon i komputer, bez instalacji (Chrome, Firefox, Edge, Safari, Opera)
- **Bez logowania:** analiza działa w całości
- Raport: link albo PDF z okna druku
- Konto gospodarstwa opcjonalne: wielu członków, historia raportów

**Grafika:** zrzut: raport na telefonie 390 px i podgląd PDF (`/report/:id/print`).

**Notatka:** Rolnik w polu ma telefon, więc projektowaliśmy najpierw pod niego. Prosty język, bez żargonu. Kryterium: prostota obsługi.

---

## Slajd 9. Architektura, szybkość, skalowalność, koszty

- React + MUI + Leaflet → Express + TypeScript → MongoDB Atlas
- Źródła równolegle, budżet 25 s; **cache: ok. 0,3 s, zimny start 8–20 s**
- Awaria źródła = „brak danych”, bez zgadywania; zapas Open-Meteo → NASA POWER
- Dziś koszt zbliżony do zera; ok. 1600 analiz dziennie z jednego IP (Open-Meteo)
- Wzrost: płatny plan Open-Meteo i Atlas, więcej instancji, własny mirror ERA5

**Grafika:** diagram z README §3 (przeglądarka → backend → źródła i MongoDB).

**Notatka:** Spełniamy preferowane ≤ 30 s. Kolejka zadań i pre-cache to kierunki, jeszcze niezaimplementowane. Koszty skalowania: [DO UZUPEŁNIENIA: wycena przy realnym ruchu].

---

## Slajd 10. Dalszy rozwój i wdrożenie w KOWR/ODR

- Dokładniejsze dane: IMGW-PIB, MPHP/ISOK, własny ekstrakt OSM
- Prognoza pogody i uwzględnienie wykonanych zabiegów
- Kolejka zadań i pre-cache popularnych działek
- Wdrożenie przez KOWR i ODR: doradcy i rolnicy z jednego narzędzia
- **Zespół HackNation** [DO UZUPEŁNIENIA: imiona i role zespołu]

**Grafika:** oś czasu: dziś (prototyp) → ERA5 własny mirror → integracja z ODR. Zdjęcie lub awatary zespołu.

**Notatka:** Kończymy zaproszeniem do sprawdzenia prototypu na własnej działce. Kryterium: innowacyjność i potencjał rozwojowy. [DO UZUPEŁNIENIA: plan wdrożenia i partnerzy, bo w README ich nie ma.]
