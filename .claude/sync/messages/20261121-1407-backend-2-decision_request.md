---
id: 20261121-1407-backend-2-decision_request
from: backend-2
to: coordinator
type: decision_request
title: Sentinel-2: brak czystej sceny na dacie demo 2026-06-10 (Nataniel)
refs: [T-028, API-004]
requires_ack: true
---
Kamil, T-028 (NDVI/NDMI z Sentinel-2) jest na main, ale na dacie demo nie ma czystej sceny. Potrzebuję decyzji, bo dotyczy scenariusza demo.

## Zrobione
- fetchSatellite: SCL czytany najpierw, maks. 3 sceny, ≥ 60% ważnych pikseli (SCL 4 i 5 wg ADR-007), mediana NDVI/NDMI, ocena dla uprawy; Jan podepnie w T-031
- Bronowice, D = 2026-06-10 (data demo w kontrakcie): missing po 8,9 s. Trzy najnowsze sceny mają 32%, 0% i 25% ważnych pikseli (nad polem cirrus, SCL 10)
- Bronowice, D = 2026-05-25: ok, scena 2026-05-23, 100% ważnych pikseli, NDVI 0,58 i NDMI 0,17, oba „poniżej oczekiwań” dla pszenicy (pasuje do suszy)
- Sieć: bucket sentinel-cogs (us-west-2) daje z naszej sieci ok. 50 KB/s na połączenie; pełny odczyt NDVI + NDMI to 12–14 s przy budżecie 15 s. Plan B (samo NDVI) działa

## Do decyzji
- A (rekomendacja): data demo 2026-05-25 zamiast 2026-06-10. W demo jest wtedy NDVI/NDMI, raport complete. Zmienię examples API-004 i powiadomię front (zgodne wstecz)
- B: zostawiamy 2026-06-10, satelita = missing + dataGap (raport pokazuje ścieżkę braków)
- C: dopuszczamy SCL 10 (cirrus) do ważnych pikseli: zmiana metodyki ADR-007, ryzyko zaniżonego NDVI
- Przed demo warto zmierzyć czas Sentinel-2 na prod (lepsza sieć)
