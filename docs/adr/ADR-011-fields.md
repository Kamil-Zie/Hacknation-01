# ADR-011: Pole – zbiór sąsiadujących działek i raport zbiorczy

- Status: accepted
- Data: 2026-11-21 21:15
- Autor: coord-1 (decyzja Kamila)
- Powiązane: T-077, T-078, T-079, T-080, T-DB-012, DM-024, DM-025, API-016 … API-019

## Kontekst

Rolnik uprawia zwykle jeden kawałek ziemi złożony z kilku działek ewidencyjnych. Analiza działka po działce jest żmudna, a decyzja o wodzie dotyczy całego pola.

## Decyzja

1. **Pole (Field)** należy do konta gospodarstwa (ADR-010): nazwa + 2–20 działek. Działki muszą tworzyć spójny obszar: dwie działki sąsiadują, gdy ich granice z ULDK są w odległości ≤ 50 m (drogi dojazdowe, miedze). Liczone własną funkcją, bez nowej biblioteki.
2. **Raport zbiorczy** nie wprowadza nowego silnika: każda działka jest liczona istniejącą analizą (API-004), a wynik pola to podsumowanie ważone powierzchnią (najgorsza klasa, % powierzchni w suszy, średnia wilgotność i deficyt, najniższa pewność) + połączone rekomendacje. Pogoda i klimatologia są na siatce 9–50 km, więc kolejne działki korzystają z cache.
3. Raporty działek z raportu zbiorczego trafiają do historii konta i mają własne linki.

## Konsekwencje

- Zakres poza pierwotnym scenariuszem demo; ścieżka anonimowa bez zmian. Jeśli o 5:00 nie będzie gotowe, funkcja zostaje w `should` i nie jest pokazywana w demo. Zamrożenie 7:00 obowiązuje.
- Nowa kolekcja `fields` (T-DB-012, bez seeda).
