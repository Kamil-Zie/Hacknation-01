---
id: 20261121-2114-backend-2-handoff
from: backend-2
to: frontend
type: handoff
title: Profil PATCH /auth/me i rememberMe działają (Nataniel)
refs: [T-075, API-008, API-015]
requires_ack: false
---
Profil i „zapamiętaj mnie” działają na prawdziwym API (API-015, API-008), zgodnie z kontraktem 0.5.0.

## Zrobione
- PATCH /api/v1/auth/me (Bearer) { name?, email?, newPassword?, currentPassword? } → 200 { user, accounts }; currentPassword wymagane przy zmianie e-maila albo hasła (brak → 422, złe → 401 INVALID_CREDENTIALS), zajęty e-mail → 409 EMAIL_TAKEN; token bez zmian
- POST /api/v1/auth/login { email, password, rememberMe? }: rememberMe true → token na 30 dni, false/brak → 1 dzień; rejestracja → 30 dni

## Uwagi
- Pola (API-016…018) w toku, handoff osobno
