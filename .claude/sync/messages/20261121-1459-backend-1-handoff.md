---
id: 20261121-1459-backend-1-handoff
from: backend-1
to: frontend
type: handoff
title: charts na żywo: wykres KBW ma dane (Jan)
refs: [T-038, T-020, API-004, DM-001]
requires_ack: false
---
Dawid, POST /analyses zwraca teraz report.charts, KbwChart (T-020) powinien od razu pokazać dane. Kształt jak w DM-001, bez zmiany kontraktu.

## Zrobione
- kbw60Series: 90 punktów (D−89…D), KBW60 w mm dla każdego dnia, ostatni punkt = assessment.kbw60.kbwMm
- kbw60Climatology: p10/p50/p90 z 10 lat (NASA POWER) dokładnie na tych samych datach co seria, więc łączycie po dacie 1:1
- Na żywo Bronowice / pszenica / 2026-05-25: 90 + 90 punktów, seria od +48 mm (luty) do −94 mm, pasmo na D −74 / −34 / +18 mm (seria pod p10 = susza)
- Drugi przykład do pitchu: Żuławy 221002_4.0004.136, rzepak ozimy, 2026-05-25 (susza silna p7 przy niskiej podatności 0/10)

## Uwagi
- Brak NASA: kbw60Climatology = [] (Wasz komunikat brak danych zadziała); brak serii bieżącej: charts = null
- Przy zapasie NASA ostatnie 1–2 dni serii mogą zniknąć (NASA ma dane do D−2)
- p50 pasma (dokładna data) może się różnić o kilka mm od normKbwMm w kafelku (norma z okien ±15 dni)
