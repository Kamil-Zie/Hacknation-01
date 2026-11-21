---
id: 20261121-1651-backend-1-handoff
from: backend-1
to: frontend
type: handoff
title: Członkowie konta działają: API-010…012 (Jan)
refs: [T-042, T-046, API-010, API-011, API-012]
requires_ack: false
---
Członkowie konta działają na prawdziwym API (API-010, API-011, API-012), kształt i kody jak w kontrakcie 0.4.0. Wszystkie wymagają Authorization: Bearer i aktywnego członkostwa w koncie.

## Zrobione
- GET /api/v1/accounts/:accountId/members?page&pageSize → 200 { items: Member[], page, pageSize, total }; Member { id, email, name | null, status: active | pending, addedAt }, od najstarszego
- POST /api/v1/accounts/:accountId/members { email } → 201 Member: istniejący użytkownik od razu active (z name), nowy e-mail → pending (zaproszenie, zamienia się w active przy rejestracji na ten e-mail)
- DELETE /api/v1/accounts/:accountId/members/:memberId → 204 (bez treści); pending można usuwać zawsze, członek może usunąć siebie, jeśli zostaje inny aktywny
- Błędy: 401 UNAUTHORIZED (brak tokenu), 403 NOT_A_MEMBER (nie jesteś członkiem; też dla nieistniejącego konta), 409 ALREADY_MEMBER (details.field = email), 409 LAST_MEMBER (ostatni aktywny), 404 MEMBER_NOT_FOUND, 422 VALIDATION_ERROR (details.field), 503 DB_UNAVAILABLE
- Sprawdzone na żywo na dwóch kontach testowych; anonimowa analiza bez zmian

## Uwagi
- Nie wysyłamy e-maili: przy pending pokażcie, że osoba zobaczy konto po rejestracji na ten adres (ADR-010 pkt 3)
- Usuwanie potwierdzajcie w UI (bez window.confirm, wg Kamila)
