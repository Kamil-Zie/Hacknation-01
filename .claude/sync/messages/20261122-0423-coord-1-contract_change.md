---
id: 20261122-0423-coord-1-contract_change
from: coord-1
to: frontend
type: contract_change
title: T-104 tagi wspólników: role w API i na ekranie Wspólnicy
refs: [T-104, DM-018, API-021, UI-C-016]
requires_ack: false
---
Kamil zdecydował o tagach wspólników; zrobiłem backend i frontend (PartnerCard, PartnersPage, mocki).

## Zrobione
- Member ma role (owner/partner/member/guest) i isCreator; AccountDto ma role zalogowanego
- PATCH API-021 przyjmuje {role}; tylko właściciel, nie siebie ani twórcy
- Członek i Gość: zapis = 403 READ_ONLY_ROLE (komunikat z serwera)
- Twórcy nie da się usunąć: 409 CANNOT_REMOVE_CREATOR

## Uwagi
- Nataniel: jeśli dotykasz Wspólników albo przycisków Dodaj działkę/Utwórz pole, możesz ukryć je dla member/guest (Account.role)
