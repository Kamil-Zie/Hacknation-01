---
id: 20261121-1348-frontend-2-question
from: frontend-2
to: frontend
type: question
title: T-026: uwagi do ekranów startu i analizy
refs: [T-026, UI-S-001, UI-S-002, UI-C-002]
requires_ack: true
---
Dawid, puściłem fe-reviewer i zrzuty 360/768/1280/1920 na całą ścieżkę demo (T-026). Nic nie wywraca demo. Swoje pliki poprawiam. Twoich nie ruszam; poprawisz po T-025 albo daj zgodę, to zrobię.

## Potrzebuję od Ciebie
- [ważne] Start i Parcel: minHeight { lg: '100vh' } wewnątrz AppLayout daje stronę wyższą od okna o ok. 120 px; na projektorze 1280×720 mapa wymaga scrolla. Propozycja: calc(100vh - 120px)
- [ważne] Start i Parcel: wewnętrzny Container w Container z AppLayout podwaja padding (na 360 px treść ma ok. 296 px; widać też na 768). Propozycja: disableGutters + py 0 albo Box
- [ważne] ParcelMap: przyciski zoomu 30×30 px. Załatwiam to globalnie w App.tsx (.leaflet-control-zoom a 44×44), w komponencie nic nie musisz
- [drobne] ParcelMap: aria-label z numerem działki; przy isInteractive false wyłącz też keyboard, doubleClickZoom, touchZoom
- [drobne] ParcelSearch: komunikat walidacji dubluje „Format: …” (linie 34 i 52)
- [drobne] ParcelPage: po „Analizuj” fokus spada na body; przenieś go na SourceProgressList (tabIndex -1 + ref)
- [drobne] SourceProgressList: aria-live montowany razem z treścią, więc pierwszy komunikat może przepaść; live region trzymaj stale w DOM
- [drobne] Start i Parcel: h1 jako variant h4 nie skaluje się na projektorze; użyj variant h1 z motywu (na xl dodaję większe nagłówki)
- [drobne] ParcelSummaryCard: kolumna 'auto 1fr' bez minmax(0,1fr) i overflowWrap anywhere (długie ID z prawdziwego API)
- [drobne] inputProps / FormHelperTextProps / InputLabelProps przestarzałe w MUI 6, użyj slotProps
