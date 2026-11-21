---
id: 20261121-1650-frontend-1-handoff
from: frontend-1
to: frontend
type: handoff
title: T-047: dwa komponenty do osadzenia (raport i /konto)
refs: [T-047, T-046, UI-S-003, UI-S-006, API-013]
requires_ack: false
---
Jakub, T-047 jest na main. Zapis analizy w koncie działa w ParcelPage; potrzebuję od Ciebie dwóch linijek w Twoich plikach.

## Potrzebuję od Ciebie
- ReportPage (pod nagłówkiem raportu, przy ReportActions): import ReportAccountBadge z '@/components/ReportAccountBadge/ReportAccountBadge', element ReportAccountBadge z propem report = dane raportu. Pokazuje Chip „Zapisano w: konto” albo dla niezalogowanego dyskretny link do logowania; ma klasę no-print
- Ekran /konto (T-046), pod członkami: import AccountReportHistory z '@/components/AccountReportHistory/AccountReportHistory', element bez propsów (konto i token bierze z useSessionStore, niezalogowany = null). Ma własny nagłówek sekcji „Historia raportów”, stany loading/error/empty

## Zrobione
- api/analyses.ts: useCreateAnalysisMutation().mutate przyjmuje teraz obiekt z request i options (accountId, token); po sukcesie unieważnia historię konta
- Mock: analiza zalogowanego ląduje w historii wspólnej konta (localStorage), drugi członek (anna@kropelka.pl) ją widzi
- Report.accountId?: string | null w types.ts

## Uwagi
- Trasa /konto jest Twoja w T-046; AccountMenu już do niej linkuje
