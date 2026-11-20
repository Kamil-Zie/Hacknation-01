# Referencje UI/UX

Karty referencji tworzy agent `fe-reference` w dwóch trybach:

- **ekran:** `<nazwa>.md` na wzór (aplikację albo stronę), opcjonalnie folder `<nazwa>/` ze zrzutami ekranu do analizy;
- **komponent:** `components/<NazwaKomponentu>.md` dla jednego elementu wyciągniętego jako wzorzec (anatomia, warianty, stany, zachowanie, responsywność, dostępność, mapowanie na naszą bibliotekę UI i propsy). Komponent trafia do `contracts/ui.json` jako `UI-C-NNN` i jest budowany raz jako reużywalny.

Karta opisuje, co przenosimy z wzoru do naszego ekranu: układ, hierarchię, rytm i gęstość, wzorce interakcji, ruch i ton. Nie przenosimy logo, kolorystyki marki, grafik, ikon, fontów, tekstów ani kodu. Zrzuty z tego folderu nie trafiają do aplikacji.

Ekran albo komponent, który korzysta z karty, ma w `contracts/ui.json` pole `reference` ze ścieżką do niej.
