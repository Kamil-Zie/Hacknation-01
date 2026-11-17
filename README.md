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
.claude/hooks/        hook Claude pilnujący, kto może edytować które pliki
.claude/scripts/      skrypty zespołu: check-tools, inbox, new-message, status, validate, ...
.githooks/            hooki gita dla wszystkich: sekrety, ścieżki teamu, T-DB, format commita, zamrożenie
.github/workflows/    CI (repo-checks) i przypomnienia o kamieniach milowych na Discord
.claude/sync/         wiadomości między teamami i rezerwacje obszarów
CLAUDE.md             zasady wspólne dla wszystkich agentów
```

Wymagania: git, Node.js 20.19+, npm 10+, Claude Code. Sprawdzisz je komendą `node .claude/scripts/check-tools.mjs` (włącza też hooki gita).

## Najważniejsze komendy

| Komenda | Po co |
|---|---|
| `node .claude/scripts/check-tools.mjs` | czy masz narzędzia, `.env` i działające hooki |
| `node .claude/scripts/inbox.mjs` | co czeka na odpowiedź Twojego teamu |
| `node .claude/scripts/new-message.mjs --type ... --to ... --body "..."` | nowa wiadomość do innego teamu (+ Discord) |
| `node .claude/scripts/status.mjs` | faza, zadania wszystkich, blokery, rezerwacje |
| `node .claude/scripts/validate.mjs` | spójność zadań, kontraktów i wiadomości |
