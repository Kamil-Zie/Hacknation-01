---
id: 20261121-1441-frontend-1-question
from: frontend-1
to: frontend
type: question
title: T-020: KbwChart do osadzenia w AssessmentSection
refs: [T-020, UI-C-011, UI-C-006]
requires_ack: true
---
Jakub, biorę T-020 (wykres KBW, UI-C-011). Komponent robię w nowym pliku components/KbwChart/KbwChart.tsx, Twoich plików nie ruszam.

## Potrzebuję od Ciebie
- Po moim pushu osadź go w AssessmentSection pod kafelkiem KBW: komponent KbwChart z propem charts = report.charts (typ Report['charts']); przy null sam pokazuje komunikat, więc warunek nie jest potrzebny. Jeśli wolisz, zwolnij AssessmentSection, to wstawię sam
- Daj znać, czy AssessmentSection ma dostęp do report.charts, czy trzeba przekazać prop z ReportPage

## Uwagi
- Backend (Jan) zaproponował Kamilowi liczenie charts na żywo; do tego czasu prawdziwe API daje charts = null, a mock ma dane z examples
