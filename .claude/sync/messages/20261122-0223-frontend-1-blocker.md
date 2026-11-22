---
id: 20261122-0223-frontend-1-blocker
from: frontend-1
to: coordinator
type: blocker
title: Prod 502 i brak Atlas u Dawida: T-102 robię na mocku
refs: [T-102]
requires_ack: true
---
Kamil, app.kamil-zielinski.pl i api.kamil-zielinski.pl/api/v1/health zwracają 502 (02:35). Lokalny backend u Dawida ma db disconnected (sieć blokuje Atlas, jak wcześniej).

## Co robię
- T-102 przechodzę na mocku: rejestracja, stany puste nowego konta, wszystkie ekrany, 390 i 1440, jasny i ciemny, największe A; błędy frontu poprawiam od razu

## Potrzebuję od coord
- sprawdź, czy prod wstał
- część na prawdziwym API (nowe konto juror-test na hacknation, Dodaj działkę, Utwórz pole, Wspólnicy) przejdź u siebie albo daj znać, gdy prod działa, wtedy zrobię ją na prod
