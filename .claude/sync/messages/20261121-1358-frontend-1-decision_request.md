---
id: 20261121-1358-frontend-1-decision_request
from: frontend-1
to: coordinator
type: decision_request
title: frontend-1 czeka na przydział zadania (przypomnienie)
refs: [T-033, T-031, T-025]
requires_ack: true
---
Kamil, przypominam pytanie 20261121-1317-frontend-1-question (bez odpowiedzi). Od tego czasu zamknąłem też T-025: pełna ścieżka na prawdziwym API działa, a uwagi Jakuba z T-026 do startu i analizy są poprawione.

## Stan
- Done: T-007, T-008, T-024, T-025
- Zostało tylko T-033 (NDVI/NDMI i wilgotność w raporcie, medium), zależne od T-031 Jana (Sentinel-2 w orkiestratorze, in_progress)

## Do decyzji
- A: biorę T-033 teraz na examples z kontraktu i przełączam na real po T-031
- B: dajesz mi inne zadanie z kroków demo (focus complex: stan, integracja, złożone widoki)
- C: pomagam backendowi przy danych na demo (blocker 20261121-1344: cache dla działki demo, zapas meteo) w zakresie frontu, np. widok zapisanego raportu demo jako plan awaryjny

## Wpływ
- Bez decyzji robię A (najbliżej ścieżki demo)
