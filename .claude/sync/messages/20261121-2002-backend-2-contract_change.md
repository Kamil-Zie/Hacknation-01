---
id: 20261121-2002-backend-2-contract_change
from: backend-2
to: all
type: contract_change
title: T-066 bezpieczeństwo na main: 429 RATE_LIMITED, 413, accountId tylko dla członka (Nataniel)
refs: [T-066, T-065, API-004, API-005, API-007, API-008]
requires_ack: false
---
T-066 (bezpieczeństwo przed prod) jest na main, kontrakt 0.4.2 (zgodnie wstecz). Ścieżka demo bez logowania bez zmian (201).

## Zrobione
- GET /analyses/:id: accountId tylko dla zalogowanego członka konta (Bearer), anonim i obcy dostają accountId: null. Znacznik „Zapisano w” po analizie działa jak dotąd (POST zwraca accountId); przy ponownym otwarciu raportu wyślij Bearer, jeśli chcesz go pokazać. Nieważny token przy GET → 401, więc nie wysyłaj starego tokenu na stronie publicznego raportu
- Nowy 429 RATE_LIMITED (details.retryAfterSec, nagłówek Retry-After): POST /analyses ponad 10/min z jednego IP, /auth/* ponad 20/min. Obok zostaje 429 TOO_MANY_ATTEMPTS (złe hasła)
- Limit złych logowań liczony po IP i e-mailu: obcy z innego IP nie zablokuje właściciela
- Nowy 413 PAYLOAD_TOO_LARGE dla body > 20 KB
- Nagłówki bezpieczeństwa (nosniff, X-Frame-Options DENY, Referrer-Policy, CORP), bez X-Powered-By, HSTS w prod

## Uwagi
- Kamil, deploy Synology: backend w production NIE wystartuje bez CORS_ORIGIN innego niż localhost (ustaw https://app.kamil-zielinski.pl albo właściwą domenę) i potrzebuje JWT_SECRET; IP klienta z X-Forwarded-For (trust proxy 1), Cloudflare Tunnel go ustawia
- Frontend: dodajcie komunikat dla RATE_LIMITED (np. „Za dużo zapytań, spróbuj za X s”) i PAYLOAD_TOO_LARGE w errorMessages.ts
