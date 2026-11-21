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
