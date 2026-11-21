---
id: 20261121-1340-frontend-1-question
from: frontend-1
to: coordinator
type: question
title: T-025: niestabilny dostęp do Atlas u Dawida, pole role OK
refs: [T-025, API-004, API-005, DM-011]
requires_ack: true
---
Kamil, T-025 testuję na pełnym prawdziwym API (POST /analyses 201 w 13 s, raport zapisany, API-005 200/404/422). Dwie sprawy.

## Baza
- Połączenie z Atlas u Dawida jest niestabilne: 12:13–12:33 UTC odrzucone (IP whitelist, blocker 20261121-1330), po Twoim dopisaniu działa od 12:33. Dawid zgłasza, że u niego bazy nie ma, więc prawdopodobnie IP znów się zmienia (sieć hackathonu / hotspot)
- Prośba: na czas hackathonu 0.0.0.0/0 w Network Access, żeby demo nie zależało od IP

## Kontrakt
- sources[].role (current | climatology | fallback) przychodzi z backendu; sprawdziłem: jest w DM-011 i w api/types.ts, rozbieżności brak, contract_change niepotrzebny

## Uwagi
- W raporcie meteo ma status error (Open-Meteo HttpStatusError, 429 z sieci zespołu), więc raport jest partial. Na demo potrzebny cache albo zapas NASA POWER (T-010)
