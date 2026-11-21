# Scenariusz pokazu finałowego

Czas: zakładamy ok. 5 min pitch + demo łącznie **[DO POTWIERDZENIA: Kamil sprawdza na Discordzie HackNation / u mentora KOWR]**. Jury wskazuje 1–3 działki (numer + data) do analizy na żywo. Role: **Prelegent** mówi, **Operator** klika i pilnuje planu awaryjnego.

## Podział czasu (5 min)

| Czas | Część | Mówi | Slajdy |
|---|---|---|---|
| 0:00–0:40 | Problem i rozwiązanie | Prelegent | 1–3 |
| 0:40–3:40 | Demo na żywo (działka jury) | Operator klika, Prelegent mówi | 4 |
| 3:40–4:40 | Dane, metodyka, wiarygodność, prostota, skalowalność | Prelegent | 5–9 |
| 4:40–5:00 | Dalszy rozwój i zakończenie | Prelegent | 10 |

Jeśli czas będzie dłuższy lub krótszy, skracamy część 3:40–4:40 (slajdy 5–6 do jednego zdania), demo zostaje.

## Przed wejściem

- Prod `https://app.kamil-zielinski.pl` otwarty w karcie 1; lokalna wersja (`npm run dev`) uruchomiona w karcie 2.
- Rano w dniu pokazu rozgrzany cache działek demo i zapasowych (zwykłe wywołanie analizy, bez zapisu wyników).
- Zapisane raporty PDF i film (do 3 min) na laptopie, offline.
- Hotspot z telefonu i VPN sprawdzone.

## Minuta po minucie

**0:00–0:40, Prelegent.** Slajd 1–3. „Rolnik podaje numer działki, wybiera uprawę i datę, a Kropelka pobiera dane na żywo z pięciu kategorii i liczy, czy grozi susza i co zrobić: najpierw zatrzymać wodę, potem agrotechnika, na końcu nawadnianie. Liczy aplikacja według jawnych reguł, nie model AI. Poproszę jury o numer działki i datę.”

**0:40–1:00, Operator.** Slajd 4, przełączenie na aplikację. Klik: pole numeru działki. Prelegent: „Numer ewidencyjny albo klik na mapie, bez logowania.”

**1:00–1:30, Operator.** Procedura „działka od jury” (niżej), kroki 1–3. Prelegent czyta numer i uprawę na głos.

**1:30–2:00, Operator.** Klik „Pokaż raport o wodzie”. Prelegent mówi w trakcie liczenia (8–20 s; z cache ok. 0,3 s):
- „Teraz pobieramy równolegle geometrię działki z ULDK, pogodę i wilgotność gleby, 10 lat tła z NASA POWER, obrazy Sentinel-2, glebę SoilGrids, teren i wody z OpenStreetMap.”
- „Każde źródło ma własny limit czasu. Jeśli któreś nie odpowie, nie wstawiamy wartości domyślnej, tylko mówimy: brak danych.”
- „Cel to rekomendacja w 30 sekund, budżet całej analizy to 25.”

**2:00–2:30, Operator.** Raport: karta „Stan wody”. Prelegent: klasa suszy, wilgotność względem normy, percentyl na tle 10 lat.

**2:30–3:00, Operator.** Przewinięcie do przyczyn. Prelegent: „Każda przyczyna ma liczby i źródło z datą.”

**3:00–3:30, Operator.** Rekomendacje. Prelegent: „Kolejność stała: retencja, agrotechnika, nawadnianie. Nawadnianie z terminem i dawką, tylko jeśli ma sens.” Operator pokazuje pewność, braki danych i ograniczenia.

**3:30–3:40, Operator.** Klik: PDF (`/report/:id/print`) lub link do raportu. Prelegent: „Raport zapisuje się i otwiera po linku.”

**3:40–5:00, Prelegent.** Slajdy 5–10 według notatek w `slides.md`. Przy slajdzie 7 podać wynik porównania z IUNG: 6 z 12 zgodnych, 3 częściowo, 3 fałszywe alarmy.

Przy 2–3 działkach: powtarzamy kroki 1–3 i 2:00–2:30 (stan wody i rekomendacje), pomijamy resztę, a drugą analizę uruchamiamy zaraz po pierwszej, by liczyła się w tle, gdy Prelegent omawia pierwszy raport.

## Procedura „działka od jury”

1. Wpisz numer działki podany przez jury (format TERYT, np. `061409_2.0009.612`).
2. Klik „Podgląd tej działki” i sprawdź na mapie, że obrys się pokazał (geometria z ULDK).
3. Wybierz uprawę i datę od jury (data: dziś lub z ostatnich 10 lat; spoza zakresu aplikacja jej nie przyjmie, powiedz to jury).
4. Klik „To moja działka – dalej”, wybierz uprawę i datę, potem „Pokaż raport o wodzie”; mów treść z 1:30–2:00.
6. Kolejna działka od jury: w nagłówku „Dodaj działkę” (czyści poprzednią); powrót do raportu: „Wstecz”.
5. Gdy numer jest błędny albo ULDK nie zwraca geometrii: kliknij działkę na mapie i powiedz o tym wprost.

## Działki zapasowe (testowane)

| Działka | Miejsce | Uprawa, data testu | Czas: zimny / z cache | Wynik (zapas NASA, 18:20) |
|---|---|---|---|---|
| `061409_2.0009.612` | Bronowice, gm. Puławy | pszenica ozima, 2026-05-25 (demo) | 11,5 s / 0,6–1,3 s | umiarkowana (na ERA5: silna) |
| `302504_5.0029.66` | Środa Wielkopolska | pszenica ozima, 2026-06-10 | 3,6 s / 0,7 s | umiarkowana |
| `040706_4.0004.15` | Kruszwica | burak cukrowy, 2026-06-10 | 8,4 s / – | brak suszy |
| `221002_4.0004.136` | Nowy Dwór Gdański | rzepak ozimy, 2026-06-10 | [po T-067] | – |
| `080906_5.0018.138/3` | Sulechów | jęczmień jary, 2026-06-10 | [po T-067] | – |
| `161002_4.0241.261` | Głogówek | kukurydza, 2026-06-10 | [po T-067] | – |

Pomiar lokalny 2026-11-21 18:20 na sieci hackathonu (Open-Meteo 429, zapas NASA). Przy tym limicie część analiz zwracała sporadycznie 502; poprawka w T-067 (Jan). Na prod (bez 429) liczy się ERA5, więc klasy mogą być wyższe, np. Bronowice silna. **Rano przed pokazem powtórzyć pomiar na prod i rozgrzać cache (T-035).**

Linki do zapisanych raportów: [DO UZUPEŁNIENIA: link do raportu każdej działki, po zapisaniu na prod].

## Plan awaryjny

| Awaria | Objaw | Co robimy | Co mówimy |
|---|---|---|---|
| Sporadyczne 502 przy 429 (do czasu T-067) | „Nie udało się pobrać danych” | Klik ponownie po 5 s; gdy znowu – działka zapasowa z cache albo VPN | „Darmowe źródło ograniczyło nas na tej sieci, ponawiamy.” |
| Open-Meteo 429 (limit IP) | w ograniczeniach raportu wzmianka o zapasie NASA | Zapas NASA POWER działa sam, nic nie klikamy. Jeśli chcemy ERA5: hotspot z telefonu lub VPN i powtórka | „Limit darmowego źródła, więc aplikacja przeszła na zapas NASA i napisała to w raporcie. Wynik jest ostrożniejszy: przy zapasie klasa „silna” tylko przy percentylu ≤ 10.” |
| Timeout Sentinel-2 | raport partial, wskaźniki satelitarne „brak danych” z kodem przyczyny (np. `CLOUD_COVER` przy chmurach) | Nie powtarzamy. Pokazujemy raport partial | „Nie mamy obrazu satelity, więc nie udajemy. Pewność spadła i raport mówi dlaczego.” |
| Pad produkcji | strona nie odpowiada | Karta 2: lokalna wersja na laptopie (`npm run dev`, `http://localhost:5173`) z hotspotem lub VPN | „Przełączamy się na wersję lokalną, ten sam kod.” |
| Pad sieci | brak internetu na sali | Zapisane raporty PDF i film do 3 min z laptopa | „Sieć nam nie sprzyja, pokazuję zapisany raport i nagranie z działania na żywo.” |
| Pytanie o rozbieżność z IUNG | pytanie jury | Odpowiedź z README §9 (niżej, pytanie 1) | Przyznajemy fałszywe alarmy i pokazujemy, co zmieniliśmy. |

Reguła: nie czekamy więcej niż ok. 25 s na analizę. Po tym czasie przechodzimy do wariantu z tabeli.

## 5 prawdopodobnych pytań jury

1. **Dlaczego wasz wynik różni się od IUNG?** Porównaliśmy 6 działek w 2 okresach (12 porównań): 6 zgodnych, 3 częściowo, 3 niezgodne. Niezgodności to fałszywe alarmy przy percentylu KBW60 14–27, na danych zapasowych NASA (siatka ok. 50 km). Możliwe przyczyny: lokalne opady niewidoczne w siatce, IUNG agreguje na gminę, my liczymy jedną działkę. Po tym wniosku zaostrzyliśmy regułę (ADR-007, aktualizacja 17:55). Próba jest mała, to sprawdzenie kierunku, nie walidacja statystyczna.
2. **Czy rekomendacje generuje AI?** Nie. Liczy je aplikacja według jawnych reguł i progów z ADR-007; aplikacja nie wywołuje żadnego modelu AI. Claude był tylko narzędziem programistycznym zespołu.
3. **Jak szybko to działa i czy się skaluje?** Raport z cache ok. 0,3 s, zimny 8–20 s przy budżecie 25 s. Odpowiedzi źródeł są w cache (365 dni dla dat historycznych). Kolejka zadań, pre-cache i więcej instancji to kierunki, jeszcze niezaimplementowane.
4. **Ile to kosztuje?** Prototyp: koszt zbliżony do zera, źródła bezpłatne. Open-Meteo to ok. 1600 analiz dziennie z jednego IP; użycie komercyjne wymaga planu płatnego, Professional ok. 99 USD/mies., a produkcja płatnego tieru Atlas (M10 ok. 57 USD/mies.); razem ok. 130–160 USD/mies. na start (README §8).
5. **Co gdy brakuje danych, np. chmury nad polem?** Wskaźniki satelitarne mają status „brak danych” (kod `CLOUD_COVER`), reguły zależne od nich się nie uruchamiają, a pewność raportu spada. Nie wstawiamy wartości domyślnych.
