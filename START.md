# START: jak zacząć pracę (sobota 21.11)

Instrukcja krok po kroku dla całego zespołu. **Kroki 1–6 zrób najlepiej w piątek wieczorem, najpóźniej w sobotę do 10:45.**
Start hackathonu: **sobota 11:00**. Kickoff zespołu: **10:45** na Discordzie.

| Osoba | ID | Główny agent | System | Twoja instrukcja |
|---|---|---|---|---|
| Kamil | `coord-1` | `coordinator` | Ubuntu | [team/kamil/README.md](team/kamil/README.md) |
| Dawid | `frontend-1` | `frontend-lead` | Windows | [team/dawid/README.md](team/dawid/README.md) |
| Jakub | `frontend-2` | `frontend-lead` | Ubuntu | [team/jakub/README.md](team/jakub/README.md) |
| Jan | `backend-1` | `backend-lead` | Windows | [team/jan/README.md](team/jan/README.md) |
| Nataniel | `backend-2` | `backend-lead` | Windows | [team/nataniel/README.md](team/nataniel/README.md) |

> **Windows (Dawid, Jan, Nataniel):** wszystkie komendy wpisuj w **Git Bash** (instaluje się razem z Git for Windows), nie w PowerShell ani cmd.

---

## Krok 1. Narzędzia

Potrzebujesz: **git 2.30+**, **Node.js 20.19+**, **npm 10+**, **Claude Code**, **VS Code**.

```bash
git --version
node --version
npm --version          # jeśli < 10:  npm install -g npm@latest
claude --version
```

Brakuje czegoś:

| Narzędzie | Ubuntu | Windows |
|---|---|---|
| git | `sudo apt install git` | https://git-scm.com/download/win (z Git Bash) |
| Node.js 22 LTS | https://nodejs.org lub `nvm install 22` | https://nodejs.org (instalator .msi) |
| Claude Code | `curl -fsSL https://claude.ai/install.sh \| bash` | w PowerShell: `irm https://claude.ai/install.ps1 \| iex` |

## Krok 2. Końcówki linii (tylko Windows, PRZED klonowaniem)

```bash
git config --global core.autocrlf false
git config --global core.eol lf
```

Bez tego hooki gita nie ruszą (`cannot exec '.githooks/pre-commit'`). Szczegóły: [docs/team-environment.md](docs/team-environment.md).
**Pliki przekazujemy wyłącznie przez git.** Nie kopiuj repo ani plików między komputerami (pendrive, chmura, zip).

## Krok 3. Repo

```bash
git clone https://github.com/Kamil-Zie/Hacknation-01.git
cd Hacknation-01
```

Masz już repo? Wtedy tylko `git pull --rebase`.

## Krok 4. Twoja tożsamość i sekrety

Sekrety (adres bazy i webhooki Discord) dostaniesz od Kamila **prywatną wiadomością**.

```bash
cp team/<twoje-imie>/settings.local.json .claude/settings.local.json   # np. team/jan/...
cp .env.example .env
```

1. W `.claude/settings.local.json` wklej webhooki Discord (`DISCORD_WEBHOOK_*`). Plik ustawia też `HACK_MEMBER` i Twojego głównego agenta.
2. W `.env` podmień linię `MONGODB_URI=...` na adres od Kamila.

Obu plików **nigdy** nie commitujesz i nie wklejasz na Discord (hook i tak to zablokuje).

## Krok 5. Sprawdzenie środowiska

```bash
node .claude/scripts/check-tools.mjs
```

Ma być **same ✅**. Skrypt sprawdza narzędzia, `HACK_MEMBER`, `.env`, połączenie z MongoDB Atlas, webhooki i **włącza hooki gita**.
Każde ❌ napraw komendą z wyniku i uruchom skrypt jeszcze raz. Nie umiesz naprawić w 10 minut: napisz do Kamila na Discordzie.

## Krok 6. Claude Code i edytor

```bash
claude
```

1. Za pierwszym razem zaloguj się: `/login` (konto claude.ai).
2. Sesja startuje od razu z Twoim głównym agentem (`coordinator`, `frontend-lead` albo `backend-lead`). Jeśli nie: `claude --agent <agent>`.
3. **Frontend (Dawid, Jakub):** w `/mcp` sprawdź, czy widać narzędzia artefaktów (Claude Design). Opcjonalne, ale preferowane.
4. Otwórz repo w VS Code i zainstaluj polecane rozszerzenia (VS Code sam je zaproponuje). Prettier formatuje przy zapisie.

Test na koniec: napisz agentowi **„Pokaż status projektu i moją skrzynkę.”** Jeśli odpowie, jesteś gotowy.

---

## Krok 7. Sobota: pierwsze godziny

| Kiedy | Kamil | Frontend (Dawid, Jakub) | Backend (Jan, Nataniel) |
|---|---|---|---|
| **10:45** | kickoff na Discordzie, sekrety rozesłane | `check-tools` = same ✅ | `check-tools` = same ✅ |
| **11:00–12:30** Koncepcja | koncepcja, stack, kontrakty, zadania; push na `main` | po pushu Kamila: przegląd `contracts/ui.json` i `api.json`, braki zgłaszacie wiadomością | przegląd `contracts/api.json` i `data_model.json`, ryzyka integracji |
| **12:30–14:00** Szkielet | szkielet repo i CI; potwierdza, że aplikacja startuje u wszystkich | `git pull --rebase`, `npm install`, `npm run dev` → front na `localhost:5173` | to samo → API na `localhost:3000/api/v1` |
| **od 14:00** Budowa | review integracji co 1–2h, decyzje | zadania z `tasks/` (na mocku zgodnym z kontraktem) | zadania z `tasks/` (endpointy kroków demo) |

Do czasu szkieletu (ok. 12:30) **nie ma jeszcze kodu aplikacji**, więc `npm run dev` uruchamiasz dopiero po komunikacie Kamila.

## Krok 8. Cykl pracy (powtarzaj przez całą dobę)

Mówisz do swojego agenta:

1. **„Weź moje następne zadanie.”** Agent robi `git pull --rebase`, czyta wiadomości, rezerwuje obszar i zaczyna.
2. Sprawdzasz efekt w przeglądarce albo curl-em.
3. Część działa: **„Zrób commit i push.”**
4. Zadanie skończone: **„Zamknij zadanie i zwolnij rezerwację.”**
5. Co jakiś czas: **„Sprawdź skrzynkę.”** (wiadomości od innych teamów).

Stoisz ponad **20 minut**: **„Wyślij blocker do koordynatora.”** i bierzesz inną część zadania.

## Zasady, których nie łamiemy

- Robimy **tylko kroki scenariusza demo** (`project.json → project.concept.demo_scenario`).
- Jedna gałąź `main`, małe commity, `git pull --rebase` przed każdym `push`.
- Agent edytuje tylko pliki Twojego teamu. Blokada hooka jest celowa, nie obchodź jej i nie używaj `--no-verify`.
- **Nie seedujesz bazy ręcznie.** Baza dev jest wspólna, seed puszcza tylko wykonawca zadania `T-DB`.
- Od **niedzieli 7:00** zamrożenie funkcji: tylko `fix`, `docs`, `revert`.

## Najważniejsze godziny

| Kiedy | Co |
|---|---|
| sob **11:00** | start |
| sob **20:00** | draft w HackTribe (repo i opis gotowe) |
| nd **07:00** | zamrożenie funkcji |
| nd **11:00** | oddanie materiałów |
| nd **15:15** | pokaz na żywo |

## Gdy coś nie działa

| Objaw | Co zrobić |
|---|---|
| `cannot exec '.githooks/...'` albo `/bin/sh^M` | CRLF: [docs/team-environment.md](docs/team-environment.md) |
| Agent nie może edytować żadnego pliku | brak `.claude/settings.local.json` albo `HACK_MEMBER`: wróć do kroku 4 |
| ❌ MongoDB Atlas | sprawdź `MONGODB_URI` w `.env`; Twoje IP może nie być na liście dostępu: napisz do Kamila |
| Hook odrzuca commit | przeczytaj komunikat, mówi dokładnie, co poprawić |
| Nic z powyższych | Discord, kanał sync, oznacz Kamila |

Więcej: [README.md](README.md) (zespół, środowiska, harmonogram), [CLAUDE.md](CLAUDE.md) (zasady dla agentów), Twoja instrukcja w `team/<imie>/README.md`.
