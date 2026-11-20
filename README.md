# HackNation

Prototyp budowany w 24 godziny przez 5 osób i zespół 21 agentów Claude Code. Hackathon: **sobota 21.11, 11:00 → niedziela 22.11, 11:00**, pokaz na żywo o **15:15**.

> To README jest instrukcją dla zespołu. Opis projektu dla jury (draft w HackTribe o 20:00, finał o 11:00) przygotowuje `coord-docs` i trafi tutaj w miejsce tej sekcji.

## Zespół

| Osoba | Rola | ID | Główny agent | Instrukcja |
|---|---|---|---|---|
| Kamil Zieliński | koordynator, fullstack | `coord-1` | `coordinator` | [team/kamil/README.md](team/kamil/README.md) |
| Dawid Jurek | frontend (zadania złożone) | `frontend-1` | `frontend-lead` | [team/dawid/README.md](team/dawid/README.md) |
| Jakub Grzywiński | frontend | `frontend-2` | `frontend-lead` | [team/jakub/README.md](team/jakub/README.md) |
| Jan Mickiewicz | backend (zadania złożone) | `backend-1` | `backend-lead` | [team/jan/README.md](team/jan/README.md) |
| Nataniel Gadziński | backend | `backend-2` | `backend-lead` | [team/nataniel/README.md](team/nataniel/README.md) |

## Start (raz, ok. 10 minut)

> Pełna instrukcja krok po kroku, z uwagami dla Windows i planem pierwszych godzin: **[START.md](START.md)**.

1. **Narzędzia:** git, Node.js 20.19+, npm 10+, Claude Code. Frontend dodatkowo (zalecane): Claude Code zalogowany kontem claude.ai (`/login`) z działającym Claude Design (sprawdź `/mcp`).
2. **Repo i tożsamość:**
   ```bash
   git clone https://github.com/Kamil-Zie/Hacknation-01.git && cd Hacknation-01
   cp team/<twoje-imie>/settings.local.json .claude/settings.local.json   # wklej webhooki Discord od Kamila
   cp .env.example .env                                                   # wklej MONGODB_URI od Kamila
   ```
3. **Sprawdzenie środowiska** (włącza też hooki gita):
   ```bash
   node .claude/scripts/check-tools.mjs
   ```
   Wszystko z ❌ zainstaluj komendą z wyniku.
4. **Sesja:** `claude` (startuje od razu z Twoim głównym agentem; jeśli nie: `claude --agent <agent>`).
5. **Edytor:** VS Code zaproponuje rekomendowane rozszerzenia (`.vscode/extensions.json`). Zainstaluj je, a formatowanie przy zapisie zadziała samo.

Sekretów (`.env`, `.claude/settings.local.json`) nie wysyłaj na Discord ani do repo. Hooki to blokują, ale lepiej nie próbować.

## Środowisko

| | Aplikacje | Baza | Adresy |
|---|---|---|---|
| **dev** | lokalnie, `npm run dev`, bez Dockera | wspólny MongoDB Atlas: klaster `hacknation`, baza `hacknation` | front `localhost:5173`, API `localhost:3000/api/v1` |
| **prod** | Synology (Docker) + Cloudflare Tunnel | ten sam klaster, baza `hacknation_prod` | `app.kamil-zielinski.pl`, `api.kamil-zielinski.pl` |

Porty i konfiguracja prod (DSM, Cloudflare Tunnel): [docs/deploy.md](docs/deploy.md). Stagingu nie ma. Baza dev jest wspólna: **nie seedujesz jej ręcznie**. Seed puszcza tylko wykonawca zadania `T-DB`.

## Jak pracujemy

- **Scenariusz demo ponad wszystko.** Robimy tylko kroki z `project.concept.demo_scenario`, pionowymi plastrami (endpoint i ekran razem).
- **Kontrakt przed kodem.** API i model danych (`contracts/api.json`, `contracts/data_model.json`) należą do backendu, UI (`contracts/ui.json`) do frontendu. Frontend startuje na mocku zgodnym z kontraktem i nie czeka na backend.
- **Zadania** w `tasks/<id>.json` (wzór: `tasks/_TEMPLATE.json`). Zanim zaczniesz, rezerwujesz obszar w `.claude/sync/claims/<twoje-id>.md`.
- **Wiadomości między teamami** to pliki w `.claude/sync/messages/`, tworzone skryptem `new-message.mjs`. Ważne typy (`handoff`, `blocker`, `breaking_change`, `decision_request`) idą od razu na Discord.
- **Zmiana bazy = zadanie `T-DB`** w tym samym commicie (`new-data-task.mjs`).
- **Jeden standard kodu** dla wszystkich: [docs/coding-standard.md](docs/coding-standard.md) (struktura, nazewnictwo, warstwy, błędy), formatowanie Prettierem i `.editorconfig`.
- **Wzór z innej aplikacji:** podaj go leadowi frontu, agent `fe-reference` przeniesie układ i odczucia całego ekranu albo wyciągnie jeden komponent jako wzorzec (bez logo, kolorów marki i grafik).
- **UI:** projekt najlepiej w Claude Design (opcjonalny, ale preferowany: Design System i canvas z ekranami telefon i desktop), zawsze responsywnie: 360, 768, 1280 i 1920 px.
- **Git:** jedna gałąź `main`, małe commity `typ(zakres): opis [T-xxx]`, `git pull --rebase` przed każdym `push`.
- **Stoisz ponad 20 minut:** `blocker` do Kamila i bierzesz inną część zadania.

Pełne zasady dla agentów: [CLAUDE.md](CLAUDE.md). Konfiguracja całego projektu: [project.json](project.json).

## Harmonogram

| Kiedy | Faza / kamień milowy |
|---|---|
| sob 11:00–12:30 | Koncepcja, stack, kontrakty, zadania |
| sob 12:30–14:00 | Szkielet: aplikacja startuje u wszystkich, szkielet na prod |
| sob 14:00–20:00 | Budowa I · **20:00 draft w HackTribe** (README i opis projektu) |
| sob 20:00–03:00 | Budowa II: kolejne kroki demo |
| nd 03:00–07:00 | Integracja: cały scenariusz na prawdziwym API i na prod |
| nd **07:00** | **Zamrożenie funkcji**: tylko `fix`, `docs`, `revert` |
| nd 07:00–11:00 | Prezentacja, wideo do 2 min, README dla jury · **11:00 oddanie materiałów** |
| nd 11:00–15:15 | Prod stabilny, próba · **15:15 pokaz na żywo** |

Przypomnienia o każdej fazie i godzinę przed każdym kamieniem milowym wysyła na Discord GitHub Actions.

## Zabezpieczenia (działają same)

| Co | Gdzie | Pilnuje |
|---|---|---|
| Ścieżki teamu | hooki Claude `guard-paths.mjs`, `guard-bash.mjs` + hook gita | każdy edytuje tylko pliki swojego teamu i własne rezerwacje, także z terminala |
| Sekrety | hook gita + CI (pliki i cała historia) | URI Mongo z hasłem, webhooki, klucze API, pliki `.env` |
| Baza | hook gita | zmiana bazy bez zadania `T-DB` |
| Spójność | hook gita + CI (`validate.mjs`) | zadania, kontrakty, wiadomości i rezerwacje |
| Format commita | hook gita | `typ(zakres): opis [T-xxx]` |
| Zamrożenie | hook gita | od 7:00 w niedzielę tylko `fix`, `docs`, `revert` |
| Styl kodu | hook gita | Prettier i ESLint na zmienionych plikach (od szkieletu) |
| Claude Design | hook Claude + check-tools | rejestruje użycie i przypomina frontendowi; blokadę można włączyć w `project.json` (`required: true`) |
| Narzędzia | `check-tools.mjs` na start każdej sesji | Node, npm, git, `.env`, Atlas, webhooki, hooki gita |

Hook zablokował commit? Przeczytaj komunikat i popraw przyczynę. `git commit --no-verify` tylko w awarii i po uzgodnieniu z Kamilem.

## Najważniejsze komendy

| Komenda | Po co |
|---|---|
| `node .claude/scripts/check-tools.mjs` | czy masz narzędzia, `.env` i działające hooki |
| `node .claude/scripts/inbox.mjs` | co czeka na odpowiedź Twojego teamu |
| `node .claude/scripts/new-message.mjs --type ... --to ... --body "..."` | nowa wiadomość do innego teamu (+ Discord) |
| `node .claude/scripts/new-data-task.mjs --title "..."` | obowiązkowe zadanie update danych przy zmianie bazy |
| `node .claude/scripts/status.mjs` | faza, zadania wszystkich, blokery, rezerwacje, wiadomości bez ack |
| `node .claude/scripts/validate.mjs` | spójność zadań, kontraktów i wiadomości |
| `node .claude/scripts/git-checks.mjs scan --history` | sekrety w całej historii (przed upublicznieniem repo) |
| `node .claude/scripts/milestone-reminder.mjs --list` | harmonogram przypomnień na Discord |

## Mapa repo

```
project.json            koncepcja, stack, teamy, zasady, harmonogram, automatyzacja (zmienia koordynator)
CLAUDE.md               zasady wspólne dla wszystkich agentów
contracts/              kontrakty: api.json, data_model.json (backend), ui.json (frontend); wzory w kluczach _example
tasks/                  zadania, jeden plik na zadanie; wzór _TEMPLATE.json
apps/frontend/          frontend (powstaje w fazie Szkielet)
apps/backend/           backend
database/               model danych i seed
docs/                   standard kodu; później architektura, scenariusz demo, pitch, plan awaryjny
team/<osoba>/           README i ustawienia sesji każdej osoby
.claude/agents/         21 agentów: coordinator + coord-*, backend-lead + be-*, frontend-lead + fe-*
.claude/hooks/          hooki Claude: ścieżki teamu (Edit/Write i terminal), znacznik Claude Design
.claude/scripts/        skrypty zespołu (Node, bez zależności)
.claude/sync/           wiadomości między teamami i rezerwacje obszarów
.githooks/              hooki gita dla wszystkich (włącza je check-tools)
.github/workflows/      CI (repo-checks) i przypomnienia o kamieniach milowych na Discord
.vscode/                wspólne ustawienia i rekomendowane rozszerzenia VS Code
.editorconfig, .prettierrc.json, .gitattributes   jeden format i końce linii LF u wszystkich
.env.example            wzór .env dla dev (bez sekretów)
```
