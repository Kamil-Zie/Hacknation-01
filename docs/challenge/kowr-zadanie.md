# Zadanie konkursowe KOWR: „Zatrzymaj wodę, chroń plony”

Źródło: Google Drive (folder zadania), pliki „KOWR - Pełna treść zadania konkursowego.pdf” i „KOWR - Podstawy naukowe.pdf”. Pobrane 2026-11-21. Poniżej wierna, skrócona treść: to źródło prawdy dla koncepcji, kontraktów i dokumentacji.

**Wybór zespołu:** rozwiązanie webowe (aplikacja w przeglądarce, responsywna, mobile jako atut).

## Cel
Cyfrowy asystent dla rolnika: dane satelitarne, meteorologiczne, glebowe, hydrologiczne i przestrzenne zamienione w konkretne decyzje dotyczące wody na **wskazanej działce ewidencyjnej**: retencja, ocena ryzyka suszy, nawadnianie. Funkcje mają się odwoływać do aktualnej wiedzy naukowej.

## Użytkownik
Rolnik z jedną lub kilkoma działkami ewidencyjnymi, bez wiedzy o GIS, teledetekcji, hydrologii czy analizie danych. Język prosty, praktyczny.

## Oczekiwany rezultat
Działający prototyp **aplikacji webowej**. Ma działać na Windows w Chrome, Firefox, Edge, Safari i Opera bez instalowania czegokolwiek. Działanie na mobile to atut.

Obszary wsparcia: 1) ocena sytuacji wodnej, 2) ograniczanie strat wilgoci, 3) zwiększanie retencji, 4) dobór działań agrotechnicznych, 5) racjonalne planowanie nawadniania.

### Kolejność analizy (obowiązkowa, kolejność ma znaczenie)
Po podaniu **identyfikatora działki** albo wskazaniu jej na mapie:
1. **Ocena stanu wilgotności**: na podstawie wskaźników satelitarnych, danych glebowych i meteo z **ostatnich 10 lat**. Interpretacja danych satelitarnych zależy od rodzaju uprawy.
2. **Rekomendacje retencyjne i agrotechniczne**: wynikają z oceny z pkt 1 i z danych o ukształtowaniu terenu, ciekach i zbiornikach (hydrologia) oraz o uprawie. Wskazują miejsca i sposoby zatrzymania wody na działce lub w gospodarstwie oraz zabiegi zwiększające retencję glebową.
3. **Rekomendacje nawadniania (opcjonalnie)**: zasadność, termin i zakres.

System nie generuje rekomendacji bez wcześniejszego rozpoznania warunków działki. Sekwencja naukowa: ocena sytuacji wodnej → przyczyny → retencja → agrotechnika → ewentualne nawadnianie.

Przykładowe rekomendacje:
- Podwyższone ryzyko suszy rolniczej z powodu niskiej retencji glebowej i częstych niedoborów opadów w okresie wegetacyjnym.
- Największe ryzyko niedoboru wody od maja do lipca, w tym czasie zalecany monitoring.
- W otoczeniu działki są warunki do retencji krajobrazowej (zatrzymanie wód opadowych, spowolnienie odpływu w rowach melioracyjnych i małych ciekach).
- Międzyplony, pozostawianie resztek pożniwnych, spowalnianie odpływu wód opadowych.

### Obowiązkowy zakres prototypu (3.3)
1. Rolnik uruchamia narzędzie w przeglądarce.
2. Wskazuje działkę ewidencyjną (numer/ID) lub jej lokalizację na mapie.
3. Wybiera aktualną uprawę.
4. Narzędzie **pobiera dane źródłowe** i ocenia bieżącą sytuację wodną oraz historyczną podatność na niedobory (dane z 10 lat). **Wynik i rekomendacje oblicza narzędzie z pobranych danych. Wyświetlenie wcześniej przygotowanych rekomendacji nie spełnia wymagań.**
5. Raport zawiera: stan niedoboru wody i jego przyczyny, rekomendacje uzasadnione danymi (retencyjne, agrotechniczne, nawadniania opcjonalnie), datę i źródła danych oraz ograniczenia (aktualność, dokładność, niepewność, czynniki nieuwzględnione). **Brak danych komunikowany wprost, bez pozornej precyzji.**
6. Raport można zapisać w systemie, w pliku (np. PDF) albo wydrukować.

Wymagane kategorie danych: meteorologiczne, satelitarne, glebowe, hydrologiczne, przestrzenne (lokalizacja działek, użytkowanie i ukształtowanie terenu).

## Wymagania formalne (zgłoszenie)
- Nazwa zespołu i tytuł rozwiązania; zwięzły opis (problem, funkcje, sposób użycia danych, korzyści).
- Link do **prywatnego** repozytorium. **Repo musi pozostać niepubliczne co najmniej do końca Wydarzenia.** Dostęp dla jury według instrukcji z Platformy konkursowej (dodanie kont albo link).
- README (wymagane sekcje niżej), prezentacja PDF do 10 slajdów, działający prototyp (link albo instrukcja uruchomienia; element obowiązkowy), film do 3 min, wygenerowane raporty.

### README musi zawierać
1. Instrukcję uruchomienia. 2. Opis podstawowych funkcji. 3. Skrócony opis architektury. 4. Źródła i zakresy danych. 5. Które dane są pobierane na bieżąco, a które pobrane lub przetworzone wcześniej, z datami pobrania (wynik musi liczyć aplikacja). 6. Wykaz bibliotek, komponentów, modeli, usług zewnętrznych i narzędzi AI. 7. Licencje i warunki korzystania z danych i komponentów. 8. Znane ograniczenia. 9. Sposób weryfikacji wyników i rekomendacji.

## Wymagania techniczne
- Technologie dowolne. AI dozwolone (opisać zakres i sposób użycia w dokumentacji).
- Dane: bezpłatne i legalne, z licencją opisaną w dokumentacji. Przykładowe źródła:
  - Satelitarne: Copernicus Data Space Ecosystem (https://documentation.dataspace.copernicus.eu), Sentinel-2 Earth Search STAC (https://earth-search.aws.element84.com/v1, bez konta).
  - Meteo: IMGW-PIB (https://danepubliczne.imgw.pl/apiinfo), Open-Meteo (https://open-meteo.com/en/terms).
  - Gleba: IUNG-PIB Monitoring Suszy (https://susza.iung.pulawy.pl/), mapa podatności gleb na suszę (https://susza.iung.pulawy.pl/mapa-kategorii/), ISRIC SoilGrids (https://docs.isric.org/globaldata/soilgrids/).
  - Przestrzenne: Geoportal (NMT/NMPT przez WCS), **ULDK GUGiK** (https://uldk.gugik.gov.pl/opis.html, geometria działki po ID), EGiB, parquet działek (https://opendata.geoportal.gov.pl/InneDane/latest_exports/eziudp_wfs/PARQUET/0_dzialki.parquet).
  - Hydrologiczne: PIG-PIB / PGW Wody Polskie, ISOK Hydroportal (https://isok.gov.pl/hydroportal.html).
  - Tło suszowe: European Drought Observatory, EDO (https://drought.emergency.copernicus.eu/data/wms-service, WMS).
- Dostępność: bez płatnej licencji, specjalnego sprzętu, znajomości GIS, programowania i instalacji. Płatne usługi trzeba wskazać z kosztami i alternatywami.
- Skalowalność: **działa dla dowolnej działki w Polsce.** Opisać limity źródeł (cache, zapis wyników, ograniczanie zapytań), aktualizację danych i koszty.
- Bezpieczeństwo: podstawowe zasady, bez zbierania danych osobowych, jeśli nie są potrzebne.

## Testowanie przez jury
- **Etap 1:** jurorzy uruchamiają prototyp dla tych samych działek z całej Polski (podają numer działki) i porównują wynik z danymi referencyjnymi. **Data analizy może być dzisiejsza albo historyczna (ostatnie 10 lat)**, więc aplikacja musi przyjmować datę analizy.
- **Etap 2 (finał, 3–5 zespołów):** pitch i demo na żywo dla 1–3 działek wskazanych przez jury (numer działki i data analizy).

## Kryteria oceny
1. Wartość praktyczna dla rolnika: **25%**
2. Wykorzystanie danych i wiarygodność rekomendacji (metody zgodne z nauką, dopasowanie do działki, uzasadnienie danymi, jawne ograniczenia i niepewność): **25%**
3. Innowacyjność i potencjał rozwojowy: **20%**
4. Prostota obsługi: **15%**
5. Działający prototyp i jakość techniczna (stabilność, architektura, kod, szybkość, bezpieczeństwo, dokumentacja, licencje): **15%**. **Preferowane: rekomendacja w ≤ 30 s dla jednej działki.**

## Podstawy naukowe (załącznik 1, skrót)
- Ocena wymaga całego bilansu wodnego, nie tylko opadów: opad i jego rozkład, straty (spływ, parowanie, transpiracja), pojemność wodna gleby.
- Odróżniać **bieżącą suszę** od **podwyższonego wieloletniego prawdopodobieństwa** suszy (warunki klimatyczne i glebowe).
- Gleby lekkie i piaszczyste zatrzymują mniej wody. Materia organiczna i próchnica zwiększają pojemność wodną.
- Wskaźniki satelitarne (roślinność, uwilgotnienie) nie są interpretowane samodzielnie, tylko łącznie z meteo, glebą i hydrologią.
- Przyczyny niedoboru: deficyt opadów z wysoką temperaturą; niska retencja gleby; nadmierny odpływ powierzchniowy (spadki terenu, brak mokradeł, oczek, zadrzewień); wymagania wodne uprawy.
- Priorytet: **retencja przed nawadnianiem** („retain water where it falls”). Krajobrazowa: małe zbiorniki, oczka, mokradła, strefy buforowe, zadrzewienia. Glebowa: międzyplony, resztki pożniwne, ograniczona uprawa, materia organiczna.
- Rozwiązanie ma: integrować 5 kategorii danych, identyfikować przyczyny, uwzględniać uprawę i lokalne warunki, **wskazywać niepewność**, uzasadniać rekomendacje danymi.
- Bibliografia: FAO-56 (Allen i in., ewapotranspiracja upraw, współczynniki Kc), IUNG-PIB System Monitoringu Suszy Rolniczej (Doroszewski i in. 2012, klimatyczny bilans wodny KBW), EC Natural Water Retention Measures (2014, 2015), FAO Water scarcity (2019), Minasny i in. 2017 (4 per mille), Żyłowska i Kozyra 2025 (wskaźniki suszy). Polecane: POLSA „Dane satelitarne dla administracji” (rozdz. 6.3.3, 6.3.4), CDR „Melioracje, retencja i gospodarka wodna” (2025).

## Mentorzy
Dr inż. Tymoteusz Bolewski (susza, bilans wodny), Borys Czerniejewski (usługi cyfrowe, UX), dr hab. Dariusz Gozdowski (agrotechnika, dane satelitarne), Tomasz Rychlicki (GIS, dane publiczne, API, mapy). Godziny konsultacji: Discord.
