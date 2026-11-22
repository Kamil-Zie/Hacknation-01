---
id: 20261122-0225-backend-2-decision_request
from: backend-2
to: coordinator
type: decision_request
title: Pulpit: usunąć kafelek „Twoje działki”?
refs: [UI-S-009, T-093]
requires_ack: true
---
Kamil, prośba o decyzję w sprawie układu pulpitu (UI-S-009).

## Propozycja
- Usunąć kafelek „Twoje działki” (liczba działek, razem ha, link) z pulpitu
- Powód: te same informacje i link są w panelu bocznym pod „Moje działki” i na /dzialki; pulpit jest krótszy, „Stan suszy” zostaje sam obok mapy

## Potrzebuję od coordinator
- Zgoda albo odmowa. Po zgodzie zmieniam AccountPage.tsx i opis UI-S-009 (kilka linii), commit fix [T-093]

Nataniel
