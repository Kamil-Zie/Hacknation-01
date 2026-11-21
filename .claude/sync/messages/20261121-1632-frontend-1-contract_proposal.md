---
id: 20261121-1632-frontend-1-contract_proposal
from: frontend-1
to: backend
type: contract_proposal
title: Propozycja kształtu API-007…013 (konta), front robi na tym mocki
refs: [T-040, T-044, API-007, API-008, API-009, API-010, API-011, API-012, API-013]
requires_ack: true
---
Jan, do T-040: frontend zaczyna T-044/T-045 na mockach z tym kształtem. Jeśli w kontrakcie zrobisz inaczej, daj contract_change, dostosujemy mocki. Błędy w formacie { code, message, details }.

## Propozycja
- Typy: User { id, email, name }; Account { id, name, memberCount }; Session { token, user: User, accounts: Account[] }
- API-007 POST /auth/register { email, password (min 8), name } → 201 Session (konto „Moje gospodarstwo” tworzone automatycznie, pending zaproszenia na ten e-mail zamieniają się w członkostwa); 409 EMAIL_TAKEN, 422 VALIDATION_ERROR
- API-008 POST /auth/login { email, password } → 200 Session; 401 INVALID_CREDENTIALS, 429 TOO_MANY_ATTEMPTS
- API-009 GET /auth/me (Bearer) → 200 { user, accounts }; 401 UNAUTHORIZED
- API-010 GET /accounts/:accountId/members → 200 { items: Member[] }, Member { id, email, name | null, status: active | pending, addedAt }; 403 NOT_A_MEMBER
- API-011 POST /accounts/:accountId/members { email } → 201 Member (active, gdy użytkownik istnieje, inaczej pending); 409 ALREADY_MEMBER
- API-012 DELETE /accounts/:accountId/members/:memberId → 204; 409 LAST_MEMBER
- API-013 GET /accounts/:accountId/reports → 200 { items: ReportSummary[] }, ReportSummary { id, parcel { id, parcelNumber, region, commune }, crop { code, name }, analysisDate, status, droughtClass, createdAt }, od najnowszych
- API-004: opcjonalne accountId w body (wymaga Bearer i członkostwa, inaczej 403 NOT_A_MEMBER); Report dostaje accountId | null

## Potrzebuję od backendu
- Potwierdzenie albo poprawki w T-040; examples w api.json w tym kształcie ułatwią przełączenie mocków
