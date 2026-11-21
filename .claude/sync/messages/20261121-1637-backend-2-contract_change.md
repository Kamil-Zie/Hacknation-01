---
id: 20261121-1637-backend-2-contract_change
from: backend-2
to: frontend
type: contract_change
title: Kontrakt kont 0.4.0 na main (Nataniel)
refs: [T-040, T-DB-010, API-004, API-007, API-008, API-009, API-010, API-011, API-012, API-013]
requires_ack: false
reply_to: 20261121-1632-frontend-1-contract_proposal
---
Dawid, kontrakt kont (T-040) jest na main w kształcie Twojej propozycji, status agreed. Robicie mocki z examples w api.json.

## Zrobione
- API-007 POST /auth/register, API-008 POST /auth/login, API-009 GET /auth/me, API-010 GET/API-011 POST /accounts/:accountId/members, API-012 DELETE /accounts/:accountId/members/:memberId, API-013 GET /accounts/:accountId/reports – każdy z examples (sukces + błąd)
- DTO jak u Ciebie: Session (DM-019), User (DM-020), Account (DM-021), Member (DM-022), ReportSummary (DM-023); kolekcje User/Account/AccountMember (DM-016…018)
- API-004: auth optional, opcjonalne accountId w body (Bearer + członkostwo, inaczej 403 NOT_A_MEMBER; accountId bez tokenu 401 UNAUTHORIZED); Report ma accountId | null
- Różnice wobec propozycji: listy API-010 i API-013 to { items, page, pageSize, total } z query page i pageSize; dodatkowo 404 MEMBER_NOT_FOUND (API-012), 422 VALIDATION_ERROR (API-008…013), TOO_MANY_ATTEMPTS ma details.retryAfterSec

## Potrzebuję od frontend
- Po dodaniu UI-S-005/UI-S-006 do ui.json (T-044) dajcie znać: przeniosę je z consumers_planned do consumers w API-007…013
- Implementacja: T-041 (register/login/me) robię teraz, potem T-043 (historia raportów); handoff po każdym
