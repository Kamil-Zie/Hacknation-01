# Zgłoszenie KOWR: tekst do wklejenia w HackTribe

**Nazwa zespołu:** HackNation

**Tytuł rozwiązania:** Kropelka – zatrzymaj wodę, chroń plony

## Opis (do wklejenia)

Rolnicy w Polsce coraz częściej tracą plony przez suszę, a dane, które mogłyby pomóc (satelita, meteo, gleba, hydrologia, teren), są rozproszone, wymagają GIS i nie mówią, co zrobić na konkretnej działce. Decyzje o wodzie zapadają na wyczucie, często od razu jako nawadnianie zamiast zatrzymania wody tam, gdzie spada.

Kropelka to aplikacja webowa. Rolnik podaje numer działki ewidencyjnej albo klika ją na mapie, wybiera uprawę i datę analizy. Aplikacja pobiera na żywo dane z pięciu kategorii: meteorologiczne (Open-Meteo/ERA5, NASA POWER), satelitarne (Sentinel-2: NDVI, NDMI), glebowe (SoilGrids), hydrologiczne i terenowe (OpenStreetMap, model terenu) oraz geometrię działki (ULDK GUGiK). Na tej podstawie liczy bilans wodny według FAO-56 i podatność działki na suszę z 10 lat.

Wynik to raport w prostym języku: stan i przyczyny niedoboru z liczbami, rekomendacje w kolejności retencja, agrotechnika, nawadnianie (opcjonalnie), każda z uzasadnieniem w danych, ze źródłami, datami, poziomem pewności i ograniczeniami. Wynik i rekomendacje oblicza aplikacja według jawnych reguł, nie model AI i nie gotowe teksty. Raport można zapisać, wydrukować lub zapisać jako PDF; konto jest opcjonalne.

Korzyści: rolnik w kilkanaście sekund dostaje czytelną decyzję dla swojej działki bez GIS i bez wiedzy o źródłach danych, wie, od czego zacząć (zatrzymanie wody przed nawadnianiem) i jak bardzo może ufać wynikowi.

## Elementy zgłoszenia (KOWR 4.1)

| Element | Status |
|---|---|
| Repozytorium kodu | prywatne do końca wydarzenia; link do uzupełnienia: ______ (dostęp dla jury wg instrukcji Platformy) |
| README | gotowe (w repozytorium: `README.md`) |
| Prezentacja PDF | w przygotowaniu |
| Prototyp | instrukcja uruchomienia w README (sekcja 1); link do wersji produkcyjnej w przygotowaniu |
| Film | w przygotowaniu |
| Raporty | w przygotowaniu |

## Dlaczego chcemy zrealizować ten projekt (do wklejenia)

Polska ma jedne z najmniejszych zasobów wody w Unii Europejskiej: średnio ok. 1600 m³ na mieszkańca rocznie (Eurostat), poniżej progu ok. 1700 m³ uznawanego za granicę stresu wodnego. W latach suchych spada to do ok. 1000 m³, a odnawialne zasoby z ok. 60 mld m³ do poniżej 40 mld m³ rocznie. Zatrzymujemy przy tym mało wody: program rządowy zakłada podwojenie retencji, do 15% do 2027 roku.

Skutki odczuwają rolnicy. W suszy 2018 roku straty stwierdzono w co najmniej 239 tys. gospodarstw (MRiRW), a rząd przeznaczył na pomoc suszową 1,5 mld zł, wtedy najwięcej w historii. Pomoc przychodzi jednak po szkodzie. Tymczasem dane, które pozwalają zareagować wcześniej, są dostępne i bezpłatne: satelity Sentinel-2, reanaliza ERA5, mapy gleb, ewidencja działek. Są jednak rozproszone, wymagają wiedzy GIS i nie mówią rolnikowi, co zrobić na jego konkretnej działce.

Kropelka łączy te dane w jeden raport dla jednej działki: czy jest susza, dlaczego i co zrobić, w kolejności zalecanej przez naukę: najpierw zatrzymać wodę tam, gdzie spada, potem agrotechnika, na końcu nawadnianie. Chcemy, żeby decyzja o wodzie zapadała na podstawie danych, przed szkodą, a nie na wyczucie i po niej.

Źródła: Eurostat (przepływy rzeczne na mieszkańca), Ministerstwo Rolnictwa i Rozwoju Wsi (pomoc suszowa 2018), Wody Polskie i rządowy program przeciwdziałania niedoborowi wody (retencja). Dane sprawdzone 2026-11-21.

## Opis rozwiązania, dla kogo i jakie korzyści (do wklejenia)

Kropelka to aplikacja webowa dla rolnika, który prowadzi gospodarstwo z jedną lub kilkoma działkami i nie zna się na GIS ani teledetekcji. Pośrednio także dla doradców ODR i instytucji takich jak KOWR, które wspierają rolników w gospodarowaniu wodą.

Rolnik wpisuje numer działki ewidencyjnej albo klika ją na mapie, wybiera uprawę i datę. Aplikacja pobiera na żywo dane z pięciu kategorii: granicę działki z ULDK, pogodę i wilgotność gleby z ERA5, zdjęcia satelitarne Sentinel-2, glebę z SoilGrids, teren i pobliskie rowy i cieki. Na tej podstawie liczy bilans wodny działki według metodyki FAO-56 i IUNG-PIB i porównuje go z 10 latami. Po kilkunastu sekundach rolnik dostaje raport prostym językiem: czy na działce jest susza i jak silna, z jakiego powodu, jak często niedobór wody powtarzał się w ostatnich latach i w których miesiącach. Do tego konkretne działania w kolejności: zatrzymanie wody (np. zastawka w rowie), poprawa gleby i uprawy, a na końcu nawadnianie z terminem i dawką, tylko jeśli ma sens. Każda rekomendacja ma uzasadnienie w liczbach, źródło i datę danych, a raport mówi wprost, czego nie wie.

Korzyści dla rolnika:
- decyzja o wodzie na podstawie danych z jego działki, a nie ogólnego komunikatu dla gminy;
- tańsze działania najpierw: retencja i agrotechnika przed kosztownym nawadnianiem;
- działa na telefonie w polu, bez instalacji, logowania i opłat;
- raport do zapisania w PDF, wydruku albo udostępnienia linkiem, np. doradcy;
- opcjonalne konto gospodarstwa: wspólna historia raportów dla rodziny albo wspólników.

## Co było przed wydarzeniem i co robimy w trakcie (do wklejenia)

**Przed wydarzeniem (16–20.11.2026)** przygotowaliśmy tylko warsztat pracy zespołu, bez kodu aplikacji i bez znajomości zadania KOWR: szablon repozytorium z zasadami pracy, kontraktami API i UI do wypełnienia, systemem zadań i wiadomości między podzespołami, powiadomieniami na Discord i hookami git (format commitów, wykrywanie sekretów), konfigurację środowiska dev (wspólny klaster MongoDB Atlas, Node, bez Dockera w dev) oraz plan godzin hackathonu.

**W trakcie wydarzenia (od 21.11, godz. 11:00) powstało całe rozwiązanie:**
- analiza zadania KOWR i podstaw naukowych, koncepcja, scenariusz demo i decyzje architektoniczne (ADR);
- backend: pobieranie danych z 9 źródeł (ULDK, Open-Meteo ERA5 i ERA5-Land, NASA POWER, Sentinel-2, SoilGrids, Copernicus DEM, OpenStreetMap), silnik bilansu wodnego FAO-56 z ET0 Penmana-Monteitha i KBW IUNG-PIB, podatność z 10 lat, przyczyny i reguły rekomendacji, cache źródeł, konta gospodarstw; ok. 290 testów automatycznych;
- frontend: wyszukiwanie działki i mapa, wybór uprawy i daty, raport z wykresami, wydruk i PDF, konto gospodarstwa, wersja na telefon, test w przeglądarkach;
- weryfikacja: porównanie wyników z Monitoringiem Suszy IUNG-PIB (12 porównań) i poprawka metodyki;
- dokumentacja README według wymagań KOWR, prezentacja i scenariusz pokazu.

**Do końca wydarzenia planujemy:** wdrożenie produkcyjne z publicznym linkiem dla jury, poprawki bezpieczeństwa przed produkcją (limity zapytań, nagłówki, CORS), od 7:00 zamrożenie funkcji i tylko poprawki błędów, rozgrzanie cache i pomiar czasu na produkcji, raporty PDF z przykładowych działek, film do 3 minut i próbę pokazu na żywo.

## Instrukcja dla jury (do wklejenia, skrót README „Dla jury”)

1. Otwórz https://app.kamil-zielinski.pl (bez instalacji i logowania, komputer lub telefon).
2. Wpisz numer działki TERYT (np. 061409_2.0009.612) albo kliknij działkę na mapie → „Podgląd tej działki” → „To moja działka – dalej”.
3. Wybierz uprawę i datę analizy (dziś lub dowolna z ostatnich 10 lat) → „Pokaż raport o wodzie”. Raport po ok. 8–20 s.
4. „Pobierz PDF” albo „Drukuj” zapisuje raport; „Dodaj działkę” w nagłówku zaczyna kolejną analizę.

Uruchomienie lokalne (ok. 5 min, Node.js 20.19+, git, darmowy MongoDB Atlas M0 lub lokalny MongoDB): `cp .env.example .env` (uzupełnić MONGODB_URI), `npm install`, `npm run dev`, potem http://localhost:5173. Szczegóły i rozwiązywanie problemów: README, sekcja „Dla jury”.
