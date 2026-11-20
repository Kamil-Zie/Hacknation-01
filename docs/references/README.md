# Referencje UI/UX

Karty referencji tworzy agent `fe-reference`: jedna karta `<nazwa>.md` na wzór (aplikację albo stronę), opcjonalnie folder `<nazwa>/` ze zrzutami ekranu do analizy.

Karta opisuje, co przenosimy z wzoru do naszego ekranu: układ, hierarchię, rytm i gęstość, wzorce interakcji, ruch i ton. Nie przenosimy logo, kolorystyki marki, grafik, ikon, fontów, tekstów ani kodu. Zrzuty z tego folderu nie trafiają do aplikacji.

Ekran, który korzysta z karty, ma w `contracts/ui.json` pole `reference: "docs/references/<nazwa>.md"`.
