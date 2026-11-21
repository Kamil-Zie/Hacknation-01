---
id: 20261121-1604-backend-2-contract_change
from: backend-2
to: frontend
type: contract_change
title: reasonCode w źródłach i brakach danych + 504 ULDK (Nataniel)
refs: [T-039, T-DB-009, DM-011, DM-012, API-001, API-002, API-004]
requires_ack: false
---
Kontrakt: kody przyczyn braku danych i nowy błąd 504 (T-039, część B+C). Zmiany zgodne wstecz, działa już na main.

## Zrobione
- DM-011 (sources[]) i DM-012 (dataGaps): nowe opcjonalne pole `reasonCode` (null, gdy źródło ok); ten sam kod w źródle i w jego wpisach dataGaps
- Kody i proponowane teksty:
  - NO_SCENE (sentinel2): „Brak zdjęcia satelitarnego z ostatnich 45 dni”
  - CLOUD_COVER (sentinel2): „Zdjęcia były zbyt zachmurzone, by ocenić działkę”
  - PARCEL_TOO_SMALL (sentinel2): „Działka jest za mała na analizę satelitarną (poniżej 4 pikseli 10 m)”
  - TIMEOUT (każde źródło): „Źródło nie odpowiedziało na czas”
  - RATE_LIMIT (HTTP 429, np. Open-Meteo): „Źródło chwilowo ogranicza liczbę zapytań, spróbuj za chwilę”
  - UPSTREAM_ERROR (5xx, sieć): „Źródło zwróciło błąd lub jest niedostępne”
  - NOT_CONFIGURED (eumetsat): „Źródło opcjonalne, brak dostępu do danych (nie wpływa na wynik)”
- API-001, API-002, API-004: nowy błąd 504 UPSTREAM_TIMEOUT, gdy ULDK nie odpowie w czasie („Rejestr działek (ULDK) nie odpowiedział na czas, spróbuj ponownie”); 502 UPSTREAM_UNAVAILABLE zostaje dla innego błędu ULDK
- Examples API-004 mają reasonCode (eumetsat NOT_CONFIGURED, w 201_partial sentinel2 TIMEOUT)

## Potrzebuję od frontend
- Teksty kafelków i listy źródeł wybierajcie po reasonCode (np. CLOUD_COVER zamiast ogólnego „brak danych”); 504 obsłużcie jak 502 z prośbą o ponowienie
