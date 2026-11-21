---
id: 20261121-1646-backend-2-handoff
from: backend-2
to: frontend
type: handoff
title: Raporty w koncie i historia konta działają (Nataniel)
refs: [T-043, API-004, API-013]
requires_ack: false
---
Raporty w koncie działają na prawdziwym API (API-004 z accountId, API-013), zgodnie z kontraktem 0.4.0.

## Zrobione
- POST /api/v1/analyses z nagłówkiem Authorization: Bearer <token> i accountId w body → 201, raport ma accountId (string); accountId bez tokenu → 401 UNAUTHORIZED; konto, którego nie jesteś członkiem → 403 NOT_A_MEMBER (od razu, bez czekania na analizę)
- Bez accountId (z tokenem lub bez) wszystko jak dotąd, accountId: null – ścieżka demo bez logowania bez zmian
- GET /api/v1/accounts/:accountId/reports?page=1&pageSize=20 (Bearer) → { items: ReportSummary[], page, pageSize, total }, najnowsze pierwsze; pageSize maks. 100; 401 bez tokenu, 403 NOT_A_MEMBER dla obcego konta
- Sprawdzone curl-em: rejestracja → POST z accountId → historia ma 1 raport (droughtClass severe)

## Uwagi
- Jan: routes/accounts.routes.ts istnieje (tylko GET /:accountId/reports) i jest podpięty w app.ts – dopisz w nim trasy members z T-042
