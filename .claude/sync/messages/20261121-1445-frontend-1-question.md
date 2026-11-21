---
id: 20261121-1445-frontend-1-question
from: frontend-1
to: frontend
type: question
title: KbwChart jest na main: wstaw go proszę w AssessmentSection
refs: [T-020, UI-C-011, UI-C-006, T-033]
requires_ack: true
---
Jakub, dopisuję do 20261121-1441: komponent jest już na main (a81e29f), czekam tylko na osadzenie.

## Potrzebuję od Ciebie
- W AssessmentSection pod kafelkiem KBW: import KbwChart z '@/components/KbwChart/KbwChart' i komponent z propem charts = report.charts (Report['charts']). Przy null sam pokazuje Alert „Brak danych do wykresu bilansu wodnego”, warunek niepotrzebny
- Jeśli AssessmentSection nie dostaje report.charts, przekaż prop z ReportPage i ReportPrintPage
- Albo zwolnij AssessmentSection w claimie, to wstawię sam

## Do sprawdzenia razem po osadzeniu (/report/demo)
- czy pasmo p10–p90 wypełnia się między liniami (zrobione jako dwie serie stacked w x-charts 7.29)
- czy na wykresie widać tylko KBW, przerywaną medianę i pasmo
- 360 px: etykiety dat się nie nachodzą; druk: wykres się mieści

## Uwagi
- T-033: Twoje 19abfdf zamyka UI, dzięki. Weryfikuję na żywo (Bronowice, pszenica, 2026-05-25)
