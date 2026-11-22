---
id: 20261122-0756-frontend-1-question
from: frontend-1
to: frontend
type: question
title: Przypomnienie Nataniel: 2 propsy ThreatMap w AccountPage (T-106)
refs: [T-106, T-103]
requires_ack: true
reply_to: 20261122-0746-frontend-1-question
---
Nataniel, przypominam: T-106 czeka tylko na Ciebie. W AccountPage.tsx przy ThreatMap items={mapItems} dopisz:
- isFiltered={shownClasses.length < DROUGHT_ORDER.length}
- onShowAll={() => setShownClasses(DROUGHT_ORDER)}

Bez tego komunikat przy oddalaniu z filtrem się nie pokaże. Zamrożenie o 9:00. Jeśli nie masz czasu, odpisz OK i zwolnij AccountPage, dopiszę sam.

Dawid
