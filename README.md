# HackNation

Prototyp budowany w 24h przez 5 osób i zespół agentów Claude Code.

## Zacznij tutaj

Znajdź swój folder i przeczytaj swoje README:

| Osoba | Rola | Instrukcja |
|---|---|---|
| Kamil Zieliński | koordynator, fullstack | [team/kamil/README.md](team/kamil/README.md) |
| Dawid Jurek | frontend (zadania złożone) | [team/dawid/README.md](team/dawid/README.md) |
| Jakub Grzywiński | frontend | [team/jakub/README.md](team/jakub/README.md) |
| Jan Mickiewicz | backend (zadania złożone) | [team/jan/README.md](team/jan/README.md) |
| Nataniel Gadziński | backend | [team/nataniel/README.md](team/nataniel/README.md) |

## Mapa repo

```
project.json          koncepcja, stack, teamy, zasady, tryb hackathon (zmienia koordynator)
contracts/            kontrakty: api.json, data_model.json (backend), ui.json (frontend)
tasks/                zadania, jeden plik na zadanie
apps/frontend/        frontend (stack wybiera coord-architect)
apps/backend/         backend
database/             seedy i migracje
docs/                 architektura, scenariusz demo, pitch
team/<osoba>/         README i ustawienia sesji każdej osoby
.claude/agents/       20 agentów: coordinator + coord-*, backend-lead + be-*, frontend-lead + fe-*
.claude/hooks/        hook pilnujący, kto może edytować które pliki
.claude/sync/         wiadomości między teamami i rezerwacje obszarów
CLAUDE.md             zasady wspólne dla wszystkich agentów
```

Wymagania: git, Node.js 20+, Claude Code.
