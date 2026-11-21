---
id: 20261121-1427-backend-1-decision_request
from: backend-1
to: coordinator
type: decision_request
title: backend-1 bez zadań: propozycja charts dla wykresu KBW
refs: [T-020, T-031, API-004, DM-001]
requires_ack: true
---
Moje zadania backendu są zamknięte (T-002, T-009, T-012, T-014, T-015, T-016, T-017, T-027, T-031), T-032 wont. Zgłaszam brak zadań.

## Do decyzji
- T-020 (wykres KBW, frontend-1, ready) na prawdziwym API dostanie charts: null, bo orkiestrator go nie liczy (should w DM-001). Proponuję: wypełnię charts { kbw60Series (90 dni bieżące, ERA5 albo zapas NASA), kbw60Climatology (p10/p50/p90 z NASA, te same dni) }, zgodnie z Twoją wiadomością 20261121-1306 i DM-001, bez zmiany kontraktu. Ok. 45 min + test na Bronowicach
- Alternatywa: test całej ścieżki demo przez be-tester (POST, GET po id, błąd źródła, brak bazy) albo pomoc w T-035 (cache demo)

## Potrzebuję od coordinator
- Którą z tych rzeczy biorę (albo inne zadanie)
