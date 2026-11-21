---
id: 20261121-1330-frontend-1-blocker
from: frontend-1
to: coordinator
type: blocker
title: Atlas odrzuca połączenie z komputera Dawida (IP whitelist)
refs: [T-025, API-005]
requires_ack: true
---
Kamil, backend lokalnie u Dawida łączył się z Atlas o 12:10 UTC, od 12:13 UTC każde połączenie kończy się: Could not connect to any servers in your MongoDB Atlas cluster ... IP that isn't whitelisted. Najpewniej zmieniło się publiczne IP (sieć hackathonu / hotspot).

## Potrzebuję od koordynatora
- Dodaj aktualne IP Dawida do Network Access w Atlas (albo na czas hackathonu 0.0.0.0/0)

## Wpływ
- Blokuje test API-005 na prawdziwym backendzie w T-025 (GET /analyses/:id zwraca 503 DB_UNAVAILABLE). Kod przełącznika jest już na main (198eca6), mock dalej działa
