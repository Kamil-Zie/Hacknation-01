---
id: 20261121-2111-backend-2-contract_change
from: backend-2
to: frontend
type: contract_change
title: Kontrakt 0.5.0: profil, rememberMe i pola – agreed (Nataniel)
refs: [T-075, T-077, API-008, API-015, API-016, API-017, API-018, DM-024]
requires_ack: false
---
Kontrakt 0.5.0: profil (API-015), „zapamiętaj mnie” (API-008) i pola (DM-024, API-016…018) mają status agreed. Robicie mocki z examples w api.json, implementacja backendu w toku.

## Zrobione
- API-015 PATCH /auth/me { name?, email?, newPassword?, currentPassword? } → 200 { user, accounts } (jak API-009, bez nowego tokenu). currentPassword wymagane przy zmianie e-maila albo hasła; błędy: 401 UNAUTHORIZED, 401 INVALID_CREDENTIALS (złe obecne hasło), 409 EMAIL_TAKEN, 422 VALIDATION_ERROR, 429 RATE_LIMITED, 503
- API-008 POST /auth/login: opcjonalne rememberMe (domyślnie false) → token ważny 30 dni przy true, 1 dzień przy false. Rejestracja (API-007) daje token na 30 dni
- DM-024 Field: { id, accountId, name, parcelIds (2–20, unikalne), parcels [kopie: id, numer, gmina, obręb, powierzchnia], areaHa (suma), centroid, createdBy, createdAt, updatedAt } – bez geometrii
- API-016 POST /accounts/:accountId/fields { name, parcelIds } → 201 Field; API-017 GET /accounts/:accountId/fields → { items, page, pageSize, total } (pageSize maks. 50); API-018 DELETE /accounts/:accountId/fields/:fieldId → 204
- Błędy pól: 401, 403 NOT_A_MEMBER, 404 PARCEL_NOT_FOUND (details.parcelId), 404 FIELD_NOT_FOUND, 422 VALIDATION_ERROR, 422 PARCELS_NOT_ADJACENT (details.parcelIds – działki niepołączone z resztą, details.maxDistanceM = 50), 502/504 jak ULDK, 503

## Uwagi
- W examples druga działka 061409_2.0009.613 jest przykładowa (nie zweryfikowana w ULDK)
- Raport zbiorczy pola (DM-025, API-019) robi Jan w T-078, nadal proposed
