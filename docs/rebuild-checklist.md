# Lista kontrolna po rebuildzie produkcji (T-065)

Prod obecnie: frontend z ok. 03:20 (bundle `index-DorpEFQd.js`, brak przełączników klas suszy), backend z ponawianiem połączenia z bazą.
Zmiany poniżej trafią na prod przy następnym rebuildzie. Po rebuildzie odhaczamy punkt po punkcie na https://app.kamil-zielinski.pl (Ctrl+Shift+R).

## 0. Przed rebuildem (NAS)

- [ ] W `/docker/hacknation` podmienione `Dockerfile.backend` i `Dockerfile.frontend` z main (`c0090b6`, cache po liście refów gita)
- [ ] Log budowy pokazuje `[source] main = <najnowszy commit>`, a nie stary
- [ ] `https://api.kamil-zielinski.pl/api/v1/health` → `"db":"connected"`

## 1. Logowanie i nawigacja

- [ ] Logowanie z adresu `/` → ląduje na `/konto` (`c0fb350`)
- [ ] Rejestracja nowego konta → ląduje na `/konto` (`c0fb350`)
- [ ] Link do raportu otwarty bez sesji → po zalogowaniu wraca do tego raportu
- [ ] Logo Kropelka po zalogowaniu otwiera Pulpit (`6785c80`)

## 2. Pulpit (`/konto`, T-103)

- [ ] Desktop 1440 px: cały pulpit mieści się na jednym ekranie, mapa i wykres dzielą wysokość okna (`1097c1f`)
- [ ] Brak stopki strony, ciaśniejsze odstępy kafli (`e40cdba`)
- [ ] Kafle zajmują całą szerokość obok panelu bocznego (`fa7c36c`)
- [ ] Wykres bilansu wody mieści się w pulpicie, kompaktowy nagłówek (`1144919`)
- [ ] Zagrożone działki jako wiersze listy z kropką suszy i strzałką (`975c265`)
- [ ] Lista zagrożonych posortowana od najgorszej suszy, bez linii legendy, wypełnia kolumnę (`33f9673`)
- [ ] Przełączniki klas suszy wybierają, które działki pokazuje mapa (Pokaż/Ukryj na mapie) (`bb62fe8`)
- [ ] Przełączniki tej samej szerokości (`0ec880c`)
- [ ] Hover przełączników w ich własnym kolorze; przyciski „Dodaj działkę” i „Szybki raport” obramowane, z tym samym hoverem (`b9cf3c1`, `520af80`)
- [ ] Telefon 390 px: pulpit się układa w kolumnę, nic nie wychodzi poza ekran
- [ ] Tryb ciemny i wysoki kontrast: pulpit czytelny

- [ ] Mapa zagrożonych działek: w prawym górnym rogu „Kliknij pinezkę, aby przejść do działki”; kliknięcie pinezki otwiera raport (T-114), na 390 px dopisek nie zasłania mapy

## 2a. Ułatwienia dostępu

- [ ] Po zmianie rozmiaru tekstu, kontrastu albo trybu ciemnego na pasku pojawia się „Widok domyślny”
- [ ] Kliknięcie przywraca standardowy tekst, kontrast i tryb z ustawień systemu, przycisk znika, fokus przechodzi na „A” standardowe
- [ ] Po odświeżeniu strony widok zostaje domyślny (nic nie jest zapisane)

## 2b. Tagi wspólników (T-104)

- [ ] Wspólnicy: każda osoba ma chip Właściciel / Wspólnik / Członek / Gość, pod tytułem „Twój tag: …”
- [ ] Właściciel rozwija osobę → lista „Tag tej osoby”, zmiana zapisuje się od razu
- [ ] Twórca gospodarstwa: brak „Usuń”, brak listy tagów, opis „zawsze właściciel”
- [ ] Wspólnik widzi „Usuń” tylko przy Członku i Gościu
- [ ] Członek/Gość: brak formularza zaproszenia; próba dodania działki lub pola kończy się komunikatem „tylko oglądać”
- [ ] Nowo zaproszona osoba ma tag Członek
- [ ] Członek/Gość: w panelu bocznym brak „Dodaj działkę” i „Utwórz pole”, na Pulpicie brak „Szybki raport”, w Moich polach brak „Utwórz pole” i „Usuń”
- [ ] Członek/Gość: wejście na /dodaj-dzialke, /pole/nowe, /szybki-raport przekierowuje na Pulpit
- [ ] Członek/Gość: „Sprawdź nową działkę” i „Raport pola” działają, ale nic nie zapisuje się w gospodarstwie
- [ ] Po zmianie tagu przez właściciela wystarczy, że osoba odświeży stronę (konta odświeża /auth/me)

## 2c. Wspólnicy: wybór gospodarstwa

- [ ] Osoba w kilku gospodarstwach widzi nad listą pole „Gospodarstwo” z tagiem przy każdym
- [ ] Zmiana gospodarstwa pokazuje jego wspólników i przełącza aktywne gospodarstwo (menu konta w nagłówku)

## 2d. Dodaj działkę → raport (T-105)

- [ ] „Dodaj do moich działek” przenosi na wybór uprawy i daty (`/parcel/:id?z=dodaj`)
- [ ] Działka już na koncie: przycisk „Wybierz uprawę i sprawdź”
- [ ] Po analizie okienko „Działka sprawdzona”: „Zobacz raport” otwiera raport, „Dodaj kolejną działkę” wraca do dodawania
- [ ] Zwykłe „Sprawdź działkę” (bez dodawania) dalej od razu otwiera raport

## 2e. Raport: data w karcie gleby (T-109)

- [ ] Raport z wcześniejszą datą: „Ile wody było w glebie 10 czerwca 2026?”
- [ ] Raport na dziś: „Ile wody jest dziś w glebie?”

## 2f. Raport: bilans i norma na wierzchu (T-110)

- [ ] W karcie gleby pod suwakiem: „Bilans wody · ostatnie 30 dni do <data>”, Na ten dzień, Norma z 10 lat, różnica słowami

## 2g. NDMI (T-111)

- [ ] Raport → Więcej informacji: karta „Znormalizowany Różnicowy Wskaźnik Wilgotności (NDMI)”; w przyczynach etykieta „NDMI (Znormalizowany Różnicowy Wskaźnik Wilgotności)”

## 2h. Brak bilansu gleby: powód (T-112)

- [ ] Raport z datą z listopada (np. 142807_2.0038.72 na test@test.pl): główny kafelek „Poza sezonem” z wyjaśnieniem
- [ ] Więcej informacji → Woda w glebie: przy braku deficytu widać przyczynę (poza sezonem / mapa gleb / dane pogodowe)

## 2i. Liczby w skrócie: Teraz / Zwykle (T-113)

- [ ] Bilans 30 i 60 dni, NDVI, NDMI i wilgotność gleby pokazują „Teraz” i „Zwykle” bez rozwijania; na 390 px obie liczby się mieszczą

## 3. Backend

- [ ] Po restarcie kontenera backendu przy chwilowym braku Atlasa log pokazuje `MongoDB: next attempt in 15 s`, a potem `MongoDB connected` bez ręcznego restartu (`225693f`)

## 4. Dane na prod

- [ ] Konta demo (5 osób) założone na `hacknation_prod`
- [ ] Konto Jana: rejestracja z prod działa, gospodarstwo widoczne na Pulpicie
