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

## 3. Backend

- [ ] Po restarcie kontenera backendu przy chwilowym braku Atlasa log pokazuje `MongoDB: next attempt in 15 s`, a potem `MongoDB connected` bez ręcznego restartu (`225693f`)

## 4. Dane na prod

- [ ] Konta demo (5 osób) założone na `hacknation_prod`
- [ ] Konto Jana: rejestracja z prod działa, gospodarstwo widoczne na Pulpicie
