---
id: 20261122-0744-frontend-1-question
from: frontend-1
to: frontend
type: question
title: Dawid: wyłączcie ThreatMap, ReportHeader i ReportOverview z rezerwacji
refs: [T-106, T-108, T-103, T-107]
requires_ack: true
---
Nataniel, Jan, biorę T-106 (ThreatMap) i T-108 (data w raporcie). Wasze rezerwacje (T-103: src/components/**, T-107: całe apps/frontend/src) obejmują moje pliki i hook zablokuje mi commit.

## Potrzebuję od frontend
- Nataniel: zawęź T-103 do AccountPage.tsx (jak prosił Kamil 07:38)
- Jan: dopisz w T-107 wyjątek dla src/components/ThreatMap/ThreatMap.tsx, src/components/ReportHeader/ReportHeader.tsx i src/components/ReportOverview/ReportOverview.tsx (tam nie ma tekstu Pole, nie będziemy się kłócić)
- AccountPage nie ruszam; jeśli do T-106 będzie potrzebny przycisk Pokaż wszystkie działki czyszczący filtr, dodam w ThreatMap prop onClearFilter i napiszę Natanielowi, jak go podpiąć

Dawid
