# ADR-010: Jedno konto gospodarstwa z członkami (bez typów kont)

- Status: accepted
- Data: 2026-11-21 16:10
- Autor: coord-1 (decyzja Kamila)
- Powiązane: T-040 … T-048, DM-016 … DM-023, API-007 … API-013, UI-S-005, UI-S-006

## Kontekst

Rolnik pracuje sam albo dzieli działki z rodziną, wspólnikiem czy doradcą ODR. Nie chcemy dwóch rodzajów kont (indywidualne / firmowe) ani migracji między nimi.

## Decyzja

1. **Jeden typ konta: „Gospodarstwo” (Account).** Przy rejestracji użytkownik (User) dostaje automatycznie własne konto „Moje gospodarstwo” i jest jego członkiem. Osoba pracująca sama ma konto z jednym członkiem; wspólna praca = dodanie kolejnych członków do tego samego konta. Nic się nie przełącza ani nie migruje.
2. **Członkowie są równi** (bez ról). Każdy członek może dodać i usunąć innego członka. Nie da się usunąć ostatniego członka konta. Użytkownik może należeć do wielu kont (np. doradca ODR), w UI wybiera aktywne konto.
3. **Dodanie członka po e-mailu.** Jeśli użytkownik z tym e-mailem istnieje, od razu staje się członkiem. Jeśli nie, powstaje zaproszenie oczekujące (`pending`), które zamienia się w członkostwo przy rejestracji na ten e-mail. Nie wysyłamy e-maili (brak SMTP); dodający przekazuje link do aplikacji sam.
4. **Uwierzytelnianie: e-mail + hasło.** Hasło hashowane `crypto.scrypt` (Node, bez nowej biblioteki), token JWT HS256 (`crypto.createHmac` w `utils/jwt.ts`, bez nowej biblioteki; sekret `JWT_SECRET` w `.env`, w dev pusty = losowy przy starcie procesu, w prod wymagany; ważność 7 dni) w nagłówku `Authorization: Bearer`. Frontend trzyma token w Zustand z zapisem w localStorage. Bez odświeżania tokenu, bez resetu hasła (wont).
5. **Analiza bez logowania działa jak dotąd** (krok 1 demo, jury KOWR). Gdy użytkownik jest zalogowany, `POST /analyses` przyjmuje opcjonalne `accountId` (musi być członkiem) i raport trafia do historii konta. `GET /analyses/:id` zostaje publiczny (link do raportu = udostępnianie poza kontem).
6. **Historia konta:** zapisane raporty (Report z `accountId`) i ostatnio sprawdzane działki konta. Wszyscy członkowie widzą to samo.

## Konsekwencje

- Nowe kolekcje: User (DM-016), Account (DM-017), AccountMember z zaproszeniem (DM-018); pole `accountId` dopisane w DM-001 Report. DTO API: Session (DM-019), User (DM-020), Account (DM-021), Member (DM-022), ReportSummary (DM-023). Zadanie T-DB-010.
- Nowe endpointy API-007 … API-013, nowe ekrany UI-S-005 (logowanie/rejestracja) i UI-S-006 (konto: członkowie, historia).
- Ryzyko: zakres poza pierwotnym scenariuszem demo. Ścieżka anonimowa nie może się zmienić; zamrożenie funkcji o 7:00 obowiązuje.
- Bezpieczeństwo: limit prób logowania (prosty licznik w pamięci), walidacja e-maila i hasła (min. 8 znaków), sekret tylko w `.env`, przegląd coord-security przed prod.

## Aktualizacja 2026-11-21 16:45

- Zamiast `jose` JWT HS256 na `crypto.createHmac` (backend-2): zero nowych zależności. Kontrakt 0.4.0 (T-040) według propozycji frontend-1 20261121-1632, listy w standardzie `{ items, page, pageSize, total }`.
