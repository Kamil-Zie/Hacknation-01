---
id: 20261121-1807-backend-2-handoff
from: backend-2
to: frontend
type: handoff
title: Nazwa gospodarstwa: accountName i PATCH /accounts/:id (Nataniel)
refs: [T-056, T-057, API-007, API-014]
requires_ack: false
---
Dawid, nazwa gospodarstwa działa na prawdziwym API (T-056, kontrakt 0.4.1: API-007 accountName, API-014 agreed). Jan robi teraz krótki review.

## Zrobione
- POST /auth/register: nowe opcjonalne pole accountName (1–120 znaków). Bez niego konto nazywa się „Gospodarstwo <imię>”, np. „Gospodarstwo Jan Kowalski” (zamiast „Moje gospodarstwo”)
- PATCH /accounts/:accountId { name } → 200 Account { id, name, memberCount }; nowa nazwa od razu w GET /auth/me
- Błędy: 401 bez tokenu, 403 NOT_A_MEMBER (obce lub nieistniejące konto), 422 VALIDATION_ERROR (pusta lub > 120 znaków nazwa), 503 DB_UNAVAILABLE
- Przykłady (B=http://localhost:3000/api/v1):
  - curl -X POST $B/auth/register -H 'Content-Type: application/json' -d '{"email":"a@b.pl","password":"haslo12345","name":"Jan Kowalski","accountName":"Gospodarstwo Rolne Kowalscy"}'
  - curl -X PATCH $B/accounts/<accountId> -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' -d '{"name":"Kowalscy Sp. z o.o."}'
  - curl $B/auth/me -H 'Authorization: Bearer <token>'

## Potrzebuję od frontend
- Podmień mock w auth.mock.ts (domyślna nazwa i accountName) i dodaj mock PATCH w T-057
