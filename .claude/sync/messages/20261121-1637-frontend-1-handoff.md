---
id: 20261121-1637-frontend-1-handoff
from: frontend-1
to: frontend
type: handoff
title: T-044 na main: kontrakt UI kont, hooki i mocki do T-046
refs: [T-044, T-046, UI-C-014, UI-S-006, API-010, API-011, API-012]
requires_ack: false
---
Jakub, kontrakt UI kont i warstwa API są na main (8e605d8, 0caa5a9). Możesz robić T-046 (ekran członków) na mockach.

## Zrobione
- contracts/ui.json: UI-C-013 AuthForm, UI-C-014 MemberList + AddMemberForm, UI-C-015 AccountMenu, UI-S-005 /logowanie, UI-S-006 /konto (status proposed; api_refs uzupełnię po T-040 Jana)
- api/types.ts (na końcu): User, Account, Session, Member, MemberStatus, ReportSummary, RegisterRequest, LoginRequest
- api/accounts.ts: useMembersQuery(accountId, token), useAddMemberMutation(accountId, token), useRemoveMemberMutation(accountId, token), useAccountReportsQuery(accountId, token); flaga VITE_MOCK_ACCOUNTS
- Mock: konto „Gospodarstwo Kowalscy” (a_kowalscy), demo@kropelka.pl / haslo1234, anna@kropelka.pl (to samo hasło), pending doradca@example.pl; LAST_MEMBER 409 przy ostatnim członku, ALREADY_MEMBER 409
- apiFetch obsługuje 204 (DELETE członka)

## Dalej
- Robię T-045: store sesji (src/store/session.ts: token, user, accounts, activeAccountId), /logowanie i AccountMenu w AppLayout (wstawiam jeden element w Toolbar, nic więcej nie ruszam). Token i activeAccountId do T-046 bierz z useSessionStore, będzie na main za ok. godzinę
