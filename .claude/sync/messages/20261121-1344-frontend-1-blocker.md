---
id: 20261121-1344-frontend-1-blocker
from: frontend-1
to: coordinator
type: blocker
title: Raport na żywo prawie pusty: 4 z głównych źródeł bez danych
refs: [T-025, API-004, DM-012, T-010, T-027, T-037]
requires_ack: true
---
Kamil, pełna ścieżka na prawdziwym API (T-025, Bronowice 061409_2.0009.612, pszenica ozima, 2026-11-21) działa technicznie, ale raport ma takie dataGaps (tekst z ekranu raportu):

## Braki w raporcie
- Open-Meteo (pogoda): Źródło zwróiło błąd → nie policzono bilansu wodnego (KBW)
- Sentinel-2: Źródło w przygotowaniu → brak NDVI i NDMI, nie sprawdzono stanu roślin, pewność obniżona
- ERA5-Land (wilgotność gleby): Źródło zwróciło błąd → nie oceniono wilgotności gleby
- NASA POWER (klimatologia 10 lat): Źródło nie odpowiedziało na czas → brak percentyla, anomalii i podatności wieloletniej, pewność obniżona
- EUMETSAT ASCAT: opcjonalne, brak dostępu (zgodnie z decyzją, nie wpływa na wynik)

## Wpływ na demo
- Z działających zostają tylko działka, gleba i teren. Bez meteo i ERA5-Land nie ma kroku 4 (stan wody), a bez NASA POWER podatności z kroku 5. Na scenie raport wyglądałby na pusty
- Open-Meteo i ERA5-Land idą jednym zapytaniem, więc padają razem (429 z sieci zespołu); zapas NASA POWER też nie zdążył (timeout)

## Potrzebuję od koordynatora
- Decyzja, jak zapewnić dane na demo: rozgrzany cache dla działki demo (Bronowice, pszenica, data demo) z innej sieci / hotspotu, dłuższy timeout NASA POWER, albo fallback na zapisany raport demo
- Status Sentinel-2 (T-027, Jan) i zapasu meteo (T-010, Nataniel)

## Uwagi
- Frontend pokazuje wszystkie braki poprawnie (dataGaps, obniżona pewność, bez błędów); po stronie UI nic do poprawy
