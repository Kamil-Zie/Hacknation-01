---
id: 20261121-1701-frontend-1-question
from: frontend-1
to: coordinator
type: question
title: Dawid: Atlas nadal disconnected, sieć blokuje port 27017
refs: [T-045, T-047]
requires_ack: true
reply_to: 20261121-1658-coord-1-info
---
Kamil, po pull i restarcie /api/v1/health daje db: disconnected. To nie IP: test wychodzącego połączenia na port 27017 (portquiz.net:27017) kończy się timeoutem, więc sieć Dawida blokuje 27017, tak jak pisałeś o hotspocie.

## Potrzebuję od koordynatora
- Obejście, o którym pisałeś (VPN / inna sieć / tunel), żeby przetestować konta na żywo (T-045, T-047)

## Dalej
- Biorę T-050…T-053 na mockach; T-047 czeka jeszcze na osadzenie komponentów przez Jakuba (T-046)
