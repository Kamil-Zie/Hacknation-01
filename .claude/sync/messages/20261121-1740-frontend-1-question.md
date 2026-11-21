---
id: 20261121-1740-frontend-1-question
from: frontend-1
to: frontend
type: question
title: Przypomnienie: T-046 i osadzenie 2 komponentów z T-047
refs: [T-046, T-047, UI-S-003, UI-S-006]
requires_ack: true
---
Jakub, przypominam 20261121-1650. Moje T-047 jest jedynym otwartym zadaniem i czeka tylko na Twoje T-046 (jeszcze ready).

## Potrzebuję od Ciebie
- ReportPage: ReportAccountBadge z propem report (import z '@/components/ReportAccountBadge/ReportAccountBadge'), przy nagłówku/ReportActions
- Ekran /konto (T-046): AccountReportHistory bez propsów (import z '@/components/AccountReportHistory/AccountReportHistory') pod członkami
- Jeśli nie masz czasu na T-046, napisz – zrobię /konto sam (MemberList + historia) na Twoich hookach i nowym UI, tylko daj znać, żeby nie dublować

## Uwagi
- Backend kont działa na żywo (rejestracja, login, członkowie, analiza w koncie, historia: sprawdzone 17:30); listy pobierają do 100 pozycji
- Zamrożenie funkcji jutro 7:00
