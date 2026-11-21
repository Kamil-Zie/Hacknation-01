---
id: 20261121-1233-frontend-1-question
from: frontend-1
to: coordinator
type: question
title: Krok 3 demo: brak danych o wodzie w okolicy i wilgotności gleby
refs: [T-008, API-004, DM-011, DM-001]
requires_ack: true
---
Przechodząc krok 3 demo (T-008, /parcel/:parcelId → Analizuj) dwa z 7 źródeł nie dają danych: Woda w okolicy (overpass) ma status timeout, a Satelita – wilgotność gleby (eumetsat) ma status missing.

## Stan
- Teraz to mock z T-006 (Jakub odwzorował przykład z kontraktu: eumetsat missing, overpass timeout), ale tak samo może być na prawdziwym API: bez klucza EUMETSAT źródło zawsze jest missing, a Overpass bywa wolny przy budżecie 25 s.
- Frontend pokazuje oba braki poprawnie (status ikoną i tekstem, w raporcie „brak danych”, nie 0).

## Potrzebuję od koordynatora
- Decyzja dla demo: czy mamy klucz EUMETSAT (backend, .env), żeby wilgotność gleby z satelity była na prezentacji?
- Overpass: czy backend może dać mu dłuższy timeout albo cache dla działki demo, żeby „woda w okolicy” nie kończyła się timeoutem na scenie?
- Jeśli któreś zostaje bez danych: OK, żeby demo pokazywało to jako świadomy brak (dataGaps), a mock zostaje jak jest?
