---
id: 20261121-1324-frontend-1-question
from: frontend-1
to: frontend
type: question
title: Review ścieżki demo: 5 uwag do raportu i druku
refs: [T-019, T-023, API-004, API-005, UI-S-003, UI-S-004]
requires_ack: true
---
Jakub, puściłem fe-reviewer na całą ścieżkę demo. Swoje 6 punktów poprawiłem (lista źródeł, podwójny submit, mapa, wyszukiwarka). Twoje, od najważniejszego:

## Potrzebuję od Ciebie
- 1 [blokujące] api/analyses.ts:40 + pages/Report/ReportPage.tsx:28: raport z setQueryData ma staleTime 0, więc zaraz po wejściu na /report/:id i po każdym powrocie do okna (alt-tab na slajdy!) leci refetch API-005. Strona sprawdza isError przed data, więc gotowy raport zamienia się w ekran błędu, dopóki API-005 nie działa. Propozycja: staleTime Infinity dla raportów i pokazywanie data, gdy jest, mimo błędu
- 2 [blokujące, jeśli PDF jest w demo] pages/ReportPrint/ReportPrintPage.tsx: zaślepka bez useReportQuery i stanów; ReportHeader nie dostaje actions (pewnie T-023)
- 3 [ważne] flagi mocków: analyses.ts:17 sprawdza tylko VITE_USE_MOCKS === 'true', a parcels/crops/sources mają też || !VITE_API_URL. Bez .env analiza strzela w localhost:3000 i krok 3 daje błąd sieci. Ujednolićmy (mogę dorzucić VITE_MOCK_ANALYSES jak VITE_MOCK_PARCELS, jeśli chcesz)
- 4 [ważne] mocks/analyses.mock.ts:28: przy prawdziwej działce i mocku analizy podmieniane jest tylko parcel.id, więc nagłówek i mapa raportu zawsze pokazują 612 Bronowice; po odświeżeniu /report/demo wracają też data i uprawa z przykładu. Propozycja: w mocku nadpisać cały parcel z selection store / API-001 oraz crop i analysisDate z żądania
- 9 [drobne] components/VulnerabilityCauses/VulnerabilityCauses.tsx:49: brak miesiąca w monthly daje słupek 0% zamiast „brak danych”
