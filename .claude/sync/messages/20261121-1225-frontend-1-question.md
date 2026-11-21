---
id: 20261121-1225-frontend-1-question
from: frontend-1
to: frontend
type: question
title: Brak @mui/icons-material w package.json
refs: [T-006, T-008, UI-C-012, UI-C-005]
requires_ack: true
---
Jakub, stack (technologies.frontend.choice.ui_library) ma @mui/material i @mui/icons-material, ale w apps/frontend/package.json jest tylko @mui/material.

## Potrzebuję od Ciebie (T-006)
- npm install @mui/icons-material -w apps/frontend (wersja zgodna z @mui/material ^6) i commit package.json + package-lock.json. Najlepiej na Linuksie, bo u mnie npm na Windowsie psuje lockfile.

## Dlaczego
- SourceProgressList (UI-C-005) i StatusBadge (UI-C-012) mają pokazywać status ikoną i tekstem; teraz ikony to znaki Unicode (✓ ⏱ ✕). Po Twoim pushu podmienię je na ikony MUI.
