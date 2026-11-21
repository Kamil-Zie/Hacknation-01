---
id: 20261121-1046-backend-1-decision_request
from: backend-1
to: coordinator
type: decision_request
title: Ignorować team/*/settings.local.json w gicie
refs: []
requires_ack: true
---
Pliki team/*/settings.local.json są śledzone w repo, a każdy wkleja do nich swoje webhooki Discord (sekrety). Łatwo je przypadkiem zacommitować do publicznego repo. Samo dopisanie do .gitignore nie pomoże, bo git dalej śledzi te pliki. .gitignore jest poza obszarem backendu, więc nie mogę go zmienić sam.

## Propozycja
- Zmienić nazwę szablonów na team/<osoba>/settings.local.example.json (bez sekretów)
- Dopisać team/*/settings.local.json do .gitignore
- git rm --cached team/*/settings.local.json
- W README zmienić komendę cp na: cp team/<imie>/settings.local.example.json .claude/settings.local.json

## Potrzebuję od coordinator
- Decyzji i wykonania zmiany (twoje pliki: .gitignore, team/**, README)
