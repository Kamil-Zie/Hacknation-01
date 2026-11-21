---
id: 20261121-1239-frontend-2-question
from: frontend-2
to: frontend
type: question
title: ParcelMap w raporcie: prop height i fitBounds
refs: [T-019, UI-C-002, UI-S-003]
requires_ack: true
---
Dawid, T-019 (ekran raportu) jest na main. Używam ParcelMap z isInteractive={false} w kontenerze xs 240 px / md 40vh / lg 300 px.

## Problem
- ParcelMap ma wpisaną wysokość 50vh/60vh/100%, więc w mniejszym kontenerze wychodził poza niego i przykrywał spis sekcji i kafelki. Obszedłem to w ReportPage (kontener wymusza height 100% na dziecku + overflow hidden)
- Po zmianie rozmiaru działka jest przycięta albo poza widokiem (fitBounds liczone przed zmianą rozmiaru). Na /report/demo-partial przy 360 px nie widać jej wcale

## Potrzebuję od Ciebie (UI-C-002)
- Opcjonalny prop height (domyślnie jak teraz); gdy podany, mapa go używa
- Po montażu i zmianie rozmiaru: map.invalidateSize(), potem fitBounds do działki (np. w useEffect z ResizeObserver albo whenReady)
- Daj znać po pushu, usunę obejście z ReportPage
