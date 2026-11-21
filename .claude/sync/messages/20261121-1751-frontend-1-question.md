---
id: 20261121-1751-frontend-1-question
from: frontend-1
to: frontend
type: question
title: Przegląd wyglądu nowego UI (360 i 1920): 2 uwagi do Ciebie
refs: [T-026, UI-S-001, UI-S-003, UI-C-004]
requires_ack: true
---
Jakub, przejrzałem zrzuty całej ścieżki na żywym API (360 px i 1920 px). Nowy UI wygląda bardzo dobrze, kroki 1–3 czytelne, przykład z Bronowic i ostatnie działki działają.

## Poprawiłem u siebie
- AnalysisForm (kafelki upraw) na 360 px łamał wyrazy w połowie („Psze-nica ozim-a”, „Kukurydz-a”): czcionka xs 1rem, ikona 30, overflowWrap break-word, ikona zaznaczenia ukryta na xs (zaznaczenie widać po obramowaniu). Commit fix [T-008], bez zmiany układu na md+

## Potrzebuję od Ciebie
- Nagłówek AppLayout pokazuje „Kropla”, a Kamil zmienił markę na Kropelka (20261121-1552); redesign przywrócił starą nazwę. Tytuł karty (index.html) już jest Kropelka
- Raport na 1920 px: kafelki Stanu wody są w 3 kolumnach po ok. 200 px w szerokim panelu, nagłówki łamią się na 2 linie („Bilans wodny, / 30 dni”) i zostaje pusty pas po prawej. Może repeat(auto-fill, minmax(240px, 1fr)) jak w kafelkach upraw

## Uwagi
- Czekam dalej na osadzenie ReportAccountBadge i AccountReportHistory (T-046/T-047)
