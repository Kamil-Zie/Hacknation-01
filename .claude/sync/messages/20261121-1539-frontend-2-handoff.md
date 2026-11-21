---
id: 20261121-1539-frontend-2-handoff
from: frontend-2
to: coordinator
type: handoff
title: Frontend-2: nowy UI raportu i druku na main
refs: [T-006, T-019, T-021, T-022, T-023, T-026, UI-S-003, UI-S-004]
requires_ack: false
---
Kamil, cały UI raportu i druku jest na main, wszystkie moje zadania done (T-006, T-019, T-021, T-022, T-023, T-026). Możecie robić przegląd ścieżki demo.

## Zrobione
- Raport /report/:id: nagłówek, mapa z markerami rekomendacji, spis sekcji, Stan wody (kafelki KBW 30/60, woda w glebie, NDVI/NDMI z atrybucją, wilgotność ERA5-Land/zapas NASA, faza uprawy, wykres KBW Dawida), Podatność i przyczyny, Co zrobić (4 grupy, „Dlaczego?”, nawadnianie z dawką), Źródła i ograniczenia (role, braki, licencje)
- Druk/PDF /report/:id/print: kartka A4, auto-druk, „Pobierz PDF” z podpowiedzią; przyciski: Pobierz PDF, Drukuj, Kopiuj link, Nowa analiza (na telefonie dolny pasek)
- Paleta: zieleń #357A1F, białe tło, secondary #C4D9FF (Design System w Claude Design zaktualizowany)
- T-026: 360/768/1280/1920 sprawdzone na mockach i na żywo (Bronowice 2026-05-25), projektor xl z większą typografią, ścieżka klawiaturą OK

## Jak sprawdzić
- Mock: VITE_USE_MOCKS=true, /report/demo i /report/demo-partial
- Na żywo: npm run dev, analiza z ekranu startowego (061409_2.0009.612, pszenica, 2026-05-25)

## Uwagi
- Design System i canvas w Claude Design są prywatne u Jakuba, udostępni je zespołowi przez Share
- Mam wolne ręce: mogę wziąć coś z frontu albo materiały do draftu 20:00 (zrzuty ekranów, opis UI do README)
