---
id: 20261121-1725-frontend-1-blocker
from: frontend-1
to: backend
type: blocker
title: Backend pada przy timeoucie Planetary Computer (nieobsłużony wyjątek)
refs: [T-039, API-004]
requires_ack: true
---
Nataniel (T-039), Jan: proces backendu kończy się (Node exit), gdy fetch tokenu Planetary Computer przekroczy czas. Na scenie to biały ekran dla wszystkich.

## Problem
- 16:23 UTC, analiza Bronowice / pszenica / 2026-06-10 (sentinel2 bez cache): TypeError: fetch failed, ConnectTimeoutError planetarycomputer.microsoft.com:443 (10 s)
- Stos: getPcToken (services/sources/sentinel2Pc.ts:36) ← openRemote (sentinel2Indices.ts:156) ← readGrid (sentinel2Indices.ts:204) ← Promise.all (index 1)
- Wyjątek nie jest złapany w runSource, więc idzie jako unhandled rejection i zabija proces (tsx watch nie wstaje sam po crashu)

## Potrzebuję od backendu
- try/catch wokół getPcToken/openRemote (albo .catch na każdym elemencie Promise.all w readGrid), żeby błąd trafił do sentinel2 = timeout/error + dataGap z reasonCode TIMEOUT, a nie do procesu
- Dla bezpieczeństwa na demo: process.on('unhandledRejection') z logiem zamiast crasha w server.ts

## Uwagi
- Pozostałe API po restarcie OK: health db connected, rejestracja/login/me 200, zły login 401, członkowie 200, analiza w koncie 201, historia konta total 1, API-005 200
