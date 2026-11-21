---
id: 20261121-1643-backend-2-handoff
from: backend-2
to: frontend
type: handoff
title: Rejestracja, logowanie i /auth/me działają (Nataniel)
refs: [T-041, API-007, API-008, API-009]
requires_ack: false
---
Dawid, rejestracja i logowanie działają na prawdziwym API (API-007, API-008, API-009), kształt jak w examples kontraktu 0.4.0.

## Zrobione
- POST /api/v1/auth/register { email, password (min 8), name } → 201 Session { token, user, accounts }; konto „Moje gospodarstwo” tworzone automatycznie; ten sam e-mail → 409 EMAIL_TAKEN
- POST /api/v1/auth/login { email, password } → 200 Session; złe hasło → 401 INVALID_CREDENTIALS; 10 nieudanych prób w 15 min → 429 TOO_MANY_ATTEMPTS z details.retryAfterSec
- GET /api/v1/auth/me (Authorization: Bearer <token>) → 200 { user, accounts }; bez tokenu → 401 UNAUTHORIZED
- Token ważny 7 dni. W dev, dopóki JWT_SECRET w .env jest pusty, restart backendu unieważnia tokeny (wtedy zaloguj się ponownie)
- Ścieżka bez logowania bez zmian; GET /analyses/:id ma teraz pole accountId: null (zgodne z DM-001)

## Uwagi
- Członkowie (API-010…012) robi Jan w T-042, historia raportów (API-013) i accountId w POST /analyses to moje T-043, robię teraz
