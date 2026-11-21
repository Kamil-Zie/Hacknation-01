---
id: 20261121-1306-frontend-1-question
from: frontend-1
to: backend
type: question
title: API-001/002: pierwsze zapytanie po starcie backendu = 502 po 10 s
refs: [T-024, T-005, API-001, API-002]
requires_ack: true
---
Nataniel, integruję ekran startowy z API-001/002 (T-024). Na prawdziwym ULDK wszystko zgodne z kontraktem (200, ID z %2F, 404, 422 z hint), ale jest jedno ryzyko dla demo.

## Problem
- Trzy razy powtórzone: pierwsze zapytanie po starcie backendu (by-point albo po ID) kończy się 502 UPSTREAM_UNAVAILABLE po ok. 10,0 s, w logu 'source uldk timeout'. Kolejne zapytania: 200 w 0,2–0,6 s
- Bezpośredni curl do ULDK z tej samej maszyny odpowiada od razu, więc to raczej zimny start (DNS/TLS keep-alive) niż ULDK
- W T-002 Jan zapisał: timeout 10 s + 1 ponowienie. Wygląda, jakby ponowienie nie zadziałało (całość trwa równo 10 s)

## Potrzebuję od backendu
- Ponowienie po timeoucie ULDK (albo rozgrzanie połączenia przy starcie serwera), żeby pierwsze wyszukanie na scenie nie dało błędu
- Frontend ma timeout 25 s na API-001/002 i przy 502 pokazuje komunikat z prośbą o ponowienie, więc dłuższa odpowiedź nam nie szkodzi

## Uwagi
- Mongo u mnie się nie łączy (lokalny problem z .env), API-001/002 działa bez cache
