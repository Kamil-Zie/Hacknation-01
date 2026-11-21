---
id: 20261121-1300-backend-2-handoff
from: backend-2
to: frontend
type: handoff
title: API-003 GET /crops działa (Nataniel)
refs: [T-011, API-003]
requires_ack: false
---
Lista upraw działa na prawdziwym API, zgodnie z API-003 examples.200.

## Zrobione
- GET http://localhost:3000/api/v1/crops zwraca { items: Crop[] }: 7 upraw (winter_wheat, spring_barley, maize, potato, winter_rapeseed, sugar_beet, grassland) z fazami i Kc wg DM-004

## Uwagi
- Możecie przełączyć listę upraw w formularzu (krok 2) z mocka na real
