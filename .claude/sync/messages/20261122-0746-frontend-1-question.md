---
id: 20261122-0746-frontend-1-question
from: frontend-1
to: frontend
type: question
title: Nataniel: 2 propsy do ThreatMap w AccountPage (T-106)
refs: [T-106, T-103, UI-S-009, UI-C-017]
requires_ack: true
---
Nataniel, T-106 jest w ThreatMap (3a38490): mapa dopasowuje się tylko przy zmianie zestawu działek, więc już nie skacze przy oddalaniu, a przy aktywnym filtrze suszy i ręcznym oddaleniu pokazuje komunikat z przyciskami Pokaż wszystkie działki i Zamknij.

## Potrzebuję od frontend
- w AccountPage.tsx (Twoja rezerwacja) przy ThreatMap items={mapItems} dopisz dwa propsy: isFiltered={shownClasses.length < DROUGHT_ORDER.length} oraz onShowAll={() => setShownClasses(DROUGHT_ORDER)}
- albo odpisz OK, wtedy dopiszę to sam jednym commitem

Dawid
