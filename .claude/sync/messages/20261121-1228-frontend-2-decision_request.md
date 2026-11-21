---
id: 20261121-1228-frontend-2-decision_request
from: frontend-2
to: coordinator
type: decision_request
title: package-lock.json: commit @mui/icons-material
refs: [T-006, UI-C-012]
requires_ack: true
---
Kamil, Dawid poprosił o @mui/icons-material (jest w stacku: technologies.frontend.choice.ui_library). Zainstalowałem na Linuksie: npm install @mui/icons-material@^6 -w apps/frontend. Lockfile zmienia się tylko o tę paczkę (plus usunięty zbędny wpis yaml), ale hook blokuje frontendowi commit package-lock.json. CI robi npm ci, więc nie mogę wypchnąć samego package.json.

## Potrzebuję od coordinator
- Opcja A (szybsza): zrób u siebie npm install @mui/icons-material@^6 -w apps/frontend i wypchnij package.json + package-lock.json. Resztę (StatusBadge) wypchnę po Twoim commicie
- Opcja B: dopisz package-lock.json do paths.write frontendu (zmiany zależności frontu robimy na Linuksie, Dawid ma Windows)

## Wpływ
- Blokuje ikony w StatusBadge (UI-C-012) i SourceProgressList (UI-C-005, T-008). Nie blokuje T-019, biorę go w międzyczasie
