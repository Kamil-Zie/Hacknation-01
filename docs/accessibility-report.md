# Ułatwiony dostęp w Kropelce: raport (T-084)

Data: 2026-11-22, 00:30. Wykonał: coord-1 (w imieniu Kamila). Zakres: aplikacja webowa `apps/frontend` (React 18 + TypeScript + Vite + MUI 6 + Leaflet).

## Stan przed zmianami

Co już było:
- `lang="pl"`;
- nagłówek `header`, nawigacja `nav`, `main`;
- jeden `h1` na stronę;
- duże cele dotyku (44–56 px);
- `aria-hidden` na ikonach dekoracyjnych;
- rozwijane karty jako `role="button"` z `aria-expanded` (działają z klawiatury);
- obsługa `prefers-reduced-motion` w części animacji.

Czego brakowało:
- zmiana rozmiaru tekstu i tryb wysokiego kontrastu;
- link „Przejdź do treści”;
- widoczny fokus o grubości 3 px;
- tytuł strony unikalny dla każdego ekranu;
- stopka;
- deklaracja dostępności, tekst łatwy do czytania i mapa strony;
- poprawna hierarchia nagłówków na 4 ekranach;
- kontrast ramek pól i przycisków (1.4.11).

## Co zostało wdrożone

1. **Pasek dostępności** (`A11yBar`) nad nagłówkiem każdej strony. To własny komponent, bez zewnętrznych nakładek.
   - Trzy przyciski „A”: standardowy, większy, największy. Rozmiar to `font-size` na `<html>` (100% / 112,5% / 125%), a cała typografia jest w `rem`. Każdy przycisk ma `aria-pressed` i nazwę „Rozmiar tekstu: …”.
   - Przełącznik „Wysoki kontrast” (`aria-pressed`) dodaje klasę `html.high-contrast`:
     - czarne tło, biały tekst, żółte linki i przyciski;
     - podkreślone linki i żółty fokus;
     - mapy, zdjęcia i wykresy SVG zostają w oryginale.
   - Linki: Tekst łatwy do czytania, Deklaracja dostępności, Mapa strony. Na telefonie są w stopce, a pasek pokazuje same przyciski. Etykiety zostają dla czytnika ekranu.
2. **Preferencje** są zapisywane w `localStorage` (odczyt i zapis w `try/catch`).
   - Skrypt w `index.html` nakłada je przed pierwszym renderem. Test: klasa i rozmiar są ustawione, zanim React cokolwiek wyrenderuje, więc nic nie miga.
   - Bez zapisanego wyboru aplikacja idzie za ustawieniem systemowym `prefers-contrast: more`.
3. **Tryb wysokiego kontrastu Windows** (`forced-colors: active`): ramki na wypełnionych przyciskach i fokus w kolorze `Highlight`.
4. **Link „Przejdź do treści”** jest pierwszym elementem fokusa i prowadzi do `main#tresc` (`tabindex="-1"`).
5. **Widoczny fokus** (`:focus-visible`):
   - na stronie: ciemny obrys 3 px z białą obwódką;
   - w nagłówku: biały obrys z ciemną obwódką;
   - pola formularzy: ramka 3 px.
6. **Unikalny tytuł każdego ekranu**, np. „Raport o wodzie – Kropelka”.
7. **Semantyka:**
   - `nav aria-label="Menu główne"`;
   - menu na telefonie z `aria-controls` i `aria-expanded`;
   - stopka `footer` z `nav aria-label="Stopka"`;
   - pasek jako `section aria-label="Ułatwienia dostępu"`;
   - hierarchia nagłówków bez przeskoków (karta uprawy, ostatnie działki, panel, nowe pole).
8. **Nazwy dostępne:**
   - logo ma widoczny tekst i ukryte „– strona główna” (wcześniej nazwa nie zgadzała się z widocznym tekstem);
   - kroki kreatora mają nazwę z widocznego tekstu.
9. **Kontrast elementów interaktywnych (1.4.11):**
   - ramki pól #6B7280 (4,8:1);
   - kolor `iconMuted` (ramki przycisków raportu, ikony) zmieniony z #7FB2EE (2,2:1) na #4A87D0 (3,7:1);
   - przyciski przybliżania mapy 44 × 44 px.
10. **Ograniczenie ruchu:** przy `prefers-reduced-motion: reduce` animacje, przejścia i płynne przewijanie są wyłączone w całej aplikacji.
11. **Nowe strony publiczne:**
    - `/tekst-latwy-do-czytania` (krótkie zdania o tym, czym jest Kropelka i jak jej używać);
    - `/deklaracja-dostepnosci` (szablon według ustawy, pola `[do uzupełnienia]`);
    - `/mapa-strony`.

## Testy

### Automatyczne (axe-core 4.14.1, reguły WCAG 2.0/2.1 A i AA + best-practice)

| Strona | Przed | Po | Po: wysoki kontrast + 125% |
|---|---|---|---|
| `/` (wyszukiwanie) | 1 (heading-order) | 0 | 0 |
| `/konto` (panel) | 2 (heading-order, label-content-name-mismatch) | 0 | 0 |
| `/parcel/:id` (uprawa i data) | 1 (heading-order) | 0 | 0 |
| `/report/:id` (raport) | 1 (label-content-name-mismatch, 2 elementy) | 0 | 0 |
| `/pole/nowe` | 1 (heading-order) | 0 | 0 |
| `/konto/profil`, 404 | 1 (label-content-name-mismatch) | 0 | – |
| nowe strony dostępności | – | 0 | 0 (deklaracja) |

Axe zostawia część przypadków kontrastu jako „do sprawdzenia ręcznie”: tekst na gradientach i na mapie. Nie są to wykryte błędy.

### Ręczne

- **Klawiatura na stronie startowej**, kolejność Tab:
  1. Przejdź do treści
  2. A, A, A
  3. Wysoki kontrast
  4. Tekst łatwy do czytania, Deklaracja dostępności, Mapa strony
  5. logo
  6. Panel, Szukaj działki, Dodaj działkę
  7. Konto
  8. zakładka Numer działki
  9. pole numeru
  10. Znajdź działkę
  11. Wypróbuj na przykładowej działce
  12. ostatnie działki

  Kolejność jest logiczna i bez pułapek fokusa.
- **Klawiatura na raporcie:** Tab, potem Enter na „Przejdź do treści”, potem Tab. Fokus trafia na „Wstecz” w `main`. 18 rozwijanych kart otwiera się klawiszem Enter.
- **Wysoki kontrast i 125%:**
  - desktop 1440 px: nagłówek, kroki, raport i menu konta są czytelne, nic się nie nakłada;
  - telefon 390 px (ramka iframe): bez przewijania w poziomie na `/`, `/report/:id`, `/konto` i deklaracji;
  - po poprawce znalezionych w trakcie błędów pola wyboru i wciśnięte przyciski są czytelne.

## Znane ograniczenia i decyzje dla Kamila

- **Mapa Leaflet** nie jest w pełni dostępna dla czytnika ekranu. Numer, gmina i powierzchnia działki są podane tekstem obok mapy. Klikanie działki na mapie nie ma odpowiednika z klawiatury, ale numer, adres i GPS go zastępują.
- **Wykres bilansu** ma opis i podpis z najważniejszą wartością, ale nie ma tabeli dzień po dniu.
- **W trybie wysokiego kontrastu** gradientowa skala „Sucho – W normie – Mokro” traci kolory. Wynik zostaje tekstem („Bardzo sucho”).
- **Deklaracja dostępności** wymaga uzupełnienia:
  - osoba kontaktowa, e-mail i telefon;
  - podmiot do skarg;
  - wynik audytu ręcznego.
- **Nie sprawdzone:**
  - czytnik ekranu (NVDA, VoiceOver);
  - prawdziwy tryb wysokiego kontrastu Windows (`forced-colors`): CSS jest, nie było testu na Windows;
  - powiększenie przeglądarki do 200% (sprawdzone 125% tekstu i szerokość 390 px);
  - szerokość 320 px;
  - menu na telefonie z klawiszem Esc: obsługuje je MUI, test nie był ręczny.
- **Multimedia:** w aplikacji ich nie ma. Film z pokazu (T-062) będzie potrzebował napisów.

## Zmienione pliki

- `apps/frontend/index.html`: skrypt nakładający preferencje przed renderem
- `apps/frontend/src/store/a11y.ts` (nowy): stan i zapis preferencji
- `apps/frontend/src/app/a11yStyles.ts` (nowy): fokus, wysoki kontrast, forced-colors, ograniczenie ruchu, kontrast ramek, `srOnly`
- `apps/frontend/src/app/App.tsx`: podpięcie stylów
- `apps/frontend/src/app/theme.ts`: `iconMuted` #4A87D0
- `apps/frontend/src/app/router.tsx`: 3 trasy publiczne
- `apps/frontend/src/components/A11yBar/A11yBar.tsx` (nowy)
- `apps/frontend/src/components/AppFooter/AppFooter.tsx` (nowy)
- `apps/frontend/src/components/AppLayout/AppLayout.tsx`: link „Przejdź do treści”, pasek, `main#tresc`, stopka, tytuły stron, nazwa logo
- `apps/frontend/src/components/AppNav/AppNav.tsx`: „Menu główne”, `aria-controls`
- `apps/frontend/src/components/StepNav/StepNav.tsx`: nazwa kroku z widocznego tekstu
- `apps/frontend/src/components/SectionCard/SectionCard.tsx`: opcjonalny `headingLevel`
- `apps/frontend/src/components/AnalysisForm/AnalysisForm.tsx`, `RecentParcels/RecentParcels.tsx`, `pages/Account/AccountPage.tsx`, `pages/FieldCreate/FieldCreatePage.tsx`: poziomy nagłówków
- `apps/frontend/src/pages/{EasyRead,A11yStatement,Sitemap}/*` (nowe)

## Zasady dla zespołu (od teraz)

- Rozmiary tekstu tylko w `rem`, nigdy w `px`, bo inaczej przyciski „A” ich nie powiększą.
- Nie usuwaj `outline`. Fokus ustawia globalnie `a11yStyles.ts`.
- Nowy ekran dostaje wpis w `TITLES` w `AppLayout.tsx`.
- Kolory ramek i ikon kontrolek mają mieć kontrast co najmniej 3:1, a tekst co najmniej 4,5:1.
- Tekst tylko dla czytnika ekranu: `srOnly` z `@/app/a11yStyles`.
