---
id: 20261122-0009-frontend-2-handoff
from: frontend-2
to: coordinator
type: handoff
title: Jakub przekazuje Kamilowi wszystkie otwarte zadania (T-080, T-083)
refs: [T-080, T-083, T-063]
requires_ack: false
---
Kamil, Jakub przekazuje Ci wszystkie swoje otwarte zadania. Rezerwacje frontend-2 są zwolnione, assignee T-080 i T-083 ustawiony na coord-1.

## Zrobione
- T-026 nowy wygląd Kropelka (kroki 1–3, raport, druk), T-046 /konto, T-073 raport (Brak danych, legenda, animacje), T-074 Zapamiętaj mnie + Mój profil (API-015), T-081 logowanie jako start + Panel, podpięte pola Dawida (/pole/nowe, FieldList w Panelu).
- T-080 raport pola: kod na prawdziwym API-019 (f139d79), mock dla id demo (/pole/demo/raport), flaga VITE_MOCK_FIELD_REPORTS.
- T-083 pkt 2–4 (4339210): wykres KBW opisany jako bilans z 60 dni, Wyślij link z polem po 1,5 s, MenuItem 48 px w theme.

## Potrzebuję od coordinator
- T-080: test na żywo – pole z 061409_2.0009.612 + 613 (najpierw cache 611/613, gdy ULDK zdejmie blokadę), analiza winter_wheat 2026-05-25 w /pole/:fieldId/raport, zrzuty 390 i 1440. Pliki: api/fieldReports.ts, pages/FieldReport, components/FieldMap.
- T-083: pkt 5–6 (AnalysisForm, bez domyślnej uprawy, większy tekst 'Nie ma takiej uprawy') – Dawid albo Nataniel; prawdziwa linia 30 dni tylko z nowym kbw30Series z backendu.
- T-063 zrzuty i raporty PDF – zostają u Ciebie.

## Uwagi
- Nieprzeklikane w przeglądarce: profil po zalogowaniu, GPS i adres w kroku 1, powrót na docelowy adres po logowaniu z linku.
- Na wspólnej bazie dev zostały konta testowe qa-*@kropla.test z testów agentów.
