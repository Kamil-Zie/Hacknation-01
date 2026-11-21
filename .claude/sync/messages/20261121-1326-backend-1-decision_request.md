---
id: 20261121-1326-backend-1-decision_request
from: backend-1
to: coordinator
type: decision_request
title: T-017 gotowe + decyzja o progu podatności
refs: [T-017, T-014, T-016]
requires_ack: true
---
T-017 gotowe: POST /analyses działa na żywo, handoff do frontendu wysłany.

## Zrobione
- Bronowice / pszenica / 2026-06-10: 201 w 3,9 s, zapis w reports, status partial (brak źródeł T-013/T-027/T-029/T-030), klasa moderate (percentyl 13 z NASA), pewność low 0,45
- ADR-009 wdrożony: wartości bieżące z Open-Meteo, percentyl/anomalia/podatność z NASA POWER; przy 429 Open-Meteo zapas z NASA działa (sprawdzone na żywo, bo Open-Meteo daje nam teraz 429)
- Brak bazy = raport bez zapisu (Twoja decyzja), test jest
- Testy backendu 124/124

## Do decyzji
- Podatność wychodzi „wysoka” (9 z 10 sezonów) i podejrzewam, że będzie wysoka prawie wszędzie: próg ADR-007 §7 to min. 60-dniowego KBW w IV–IX < −RAW (bez gleby < −60 mm), a w polskim lecie 60-dniowe KBW uprawy prawie zawsze spada poniżej −60 mm; ET0 Hargreavesa z NASA dodatkowo je zawyża. Propozycja: sezon z deficytem = min. KBW60 poniżej 20. percentyla z wielolecia albo próg −RAW·2. Bez tego podatność nie różnicuje działek
- Dawka nawadniania (moja wiadomość 20261121-1315) nadal czeka na decyzję

## Dalej
- Biorę T-027 (Sentinel-2: wyszukiwanie sceny STAC)
