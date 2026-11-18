# HackNation: zasady dla wszystkich agentów

Budujemy w 24 godziny działający prototyp i prezentację. Liczy się **scenariusz demo**.

## Źródła prawdy (czytaj zanim zaczniesz)

| Co | Gdzie | Kto zmienia |
|---|---|---|
| Koncepcja, stack, zasady, teamy, tryb | `project.json` | tylko koordynator |
| Kontrakt API i model danych | `contracts/api.json`, `contracts/data_model.json` | backend (+ koordynator) |
| Kontrakt UI | `contracts/ui.json` | frontend (+ koordynator) |
| Zadania | `tasks/<id>.json` | koordynator; team zmienia w swoich tylko `status`, `assignee`, `review`, `notes`, `updated_at` |
| Wiadomości między teamami | `.claude/sync/messages/` | nowy plik na wiadomość |
| Rezerwacje w teamie | `.claude/sync/claims/<member-id>.md` | tylko właściciel pliku |

Aktywny tryb to `project.json → modes.active` (teraz `hackathon`). Ustawienia z `modes.hackathon.set` nadpisują wartości bazowe, a `modes.hackathon.rules` mają pierwszeństwo przed innymi zasadami.

## Kim jestem

Zmienna środowiskowa `HACK_MEMBER` (np. `frontend-1`) mówi, czyja to sesja. Team i uprawnienia znajdziesz w `project.json → teams`. Pliki spoza `paths.write` Twojego teamu blokuje hook `.claude/hooks/guard-paths.mjs` (Edit/Write), a zapis z terminala (`>`, `tee`, `sed -i`, `cp`/`mv`/`rm`, `node -e` z zapisem) blokuje `.claude/hooks/guard-bash.mjs`. Nie obchodź ich. Pliki zmieniaj narzędziami Edit/Write albo skryptami z `.claude/scripts/`. Jeśli potrzebujesz zmiany w cudzym obszarze, wyślij wiadomość.

## Stack

Do czasu decyzji (`technologies.status = "decided"`) nie zakładaj żadnego frameworka. Po decyzji używaj **tylko** wartości z pól `technologies.*.choice`. Nowa biblioteka spoza wyboru wymaga `decision_request` do koordynatora, chyba że jest drobna i lokalna (np. `date-fns`). Wtedy dopisz ją do notatek zadania.

## Weryfikacja narzędzi na start

Przy starcie każdej sesji hook uruchamia `node .claude/scripts/check-tools.mjs` i sprawdza: `HACK_MEMBER`, narzędzia wymagane przez stack Twojego teamu (np. Express/React → Node 20.19+ i npm 10+, zawsze git), `.env` z prawdziwym `MONGODB_URI` (backend, koordynator), dostępność klastra Atlas i webhooki Discord. Wymagania: `project.json → tooling`. Jeśli wynik ma ❌, najpierw powiedz o tym osobie i podaj komendę instalacji, dopiero potem bierz zadanie. Narzędzi systemowych nie instalujesz sam.

## Standard kodu: jeden schemat

Wszyscy agenci piszą kod według `docs/coding-standard.md`: ta sama struktura folderów, nazewnictwo, kolejność importów, wzorzec warstw (backend: route → validate → controller → service → model; frontend: page → hooki `api/` → komponenty), format błędów i komentarz z ID kontraktu na początku pliku. Formatowanie: Prettier (`.prettierrc.json`) i `.editorconfig`. Nie wymyślaj własnych wzorców; gdy podobna rzecz już istnieje w kodzie, skopiuj jej wzorzec. Hook gita odrzuca pliki niesformatowane Prettierem i z błędami ESLint (od chwili, gdy szkielet je zainstaluje).

## Projektowanie UI: Claude Design

Frontend projektuje w Claude Design: jeden Design System i jeden canvas z ekranami demo (telefon 390 px + desktop 1440 px) na projekt. Linki w `contracts/ui.json` (`design_system_url`, `design_canvas_url`, `screens[].design_artboards`), zasady w `project.json → technologies.frontend.design`. Kod implementuje ekran z artboardów, zmiany wyglądu idą najpierw na canvas. **Dla Dawida (`frontend-1`) i Jakuba (`frontend-2`) Claude Design jest obowiązkowy:** dopóki w sesji nie zadziała narzędzie Claude Design (ToolSearch „artifacts design”, potem `list_types`), hook blokuje każdą edycję plików, a hook gita ich commity. Bez tych narzędzi nie zaczynają pracy.

## Środowisko dev: aplikacje lokalnie, baza w MongoDB Atlas

Frontend i backend działają lokalnie, **bez kontenerów** (nie dodawaj Dockera do dev). Baza danych jest w chmurze: wspólny klaster MongoDB Atlas `hacknation`, baza `hacknation`, ta sama dla całego zespołu (`technologies.infrastructure.environment_config.dev`). Synology i Cloudflare są tylko dla prod (stagingu nie ma).

```bash
cp .env.example .env    # wklej MONGODB_URI od Kamila (sekret: tylko .env, nigdy repo ani Discord)
npm install && npm run dev   # front :5173, API :3000/api/v1
```

Baza dev jest wspólna, więc **nie uruchamiaj seeda ani nie zmieniaj danych ręcznie**. Seed na bazie `hacknation` puszcza tylko wykonawca zadania `T-DB`.

## Baza danych = źródło aktualnych zmian

Każda zmiana w `contracts/data_model.json`, `database/**` lub `apps/backend/src/models/**` wymaga **obowiązkowego zadania update danych** `tasks/T-DB-NNN.json` w tym samym commicie. Hook gita `pre-commit` blokuje commit bez niego (zmiany tylko w kluczach `_example`/`_note` się nie liczą).

```bash
node .claude/scripts/new-data-task.mjs --title "<co się zmieniło>" [--refs DM-001] [--breaking]
```

Wykonawca `T-DB` po zmianie kodu uruchamia `npm run seed` na wspólnej bazie dev w Atlas i wysyła wiadomość do frontendu. Przy zmianie psującej najpierw czeka na ack, dopiero potem seeduje. Pełne zasady: `project.json → data_updates`.

## Zasady hackathonu (skrót, pełna lista w project.json)

1. Pracujemy tylko nad krokami `project.concept.demo_scenario`. Reszta czeka.
2. Pionowe plastry: jeden krok demo od endpointu do ekranu, potem następny.
3. Frontend startuje na mocku zgodnym z kontraktem i nie czeka na backend.
4. Gałąź `main`: małe commity, `git pull --rebase` przed każdym `push`, push po każdej działającej części.
5. Najprostsze rozwiązanie, które działa w demo. Bez abstrakcji i optymalizacji na zapas.
6. Stoisz ponad 20 minut: `blocker` do koordynatora i bierzesz inną część zadania.
7. Po zamrożeniu funkcji (od 7:00 rano, 20h) tylko poprawki błędów na ścieżce demo.

## Wiadomości (zwykłe pliki)

Twórz je skryptem, który nadaje poprawną nazwę, id i frontmatter, a dla `blocker`, `breaking_change`, `decision_request` i `handoff` od razu wysyła Discord:

```bash
node .claude/scripts/inbox.mjs                       # co czeka na ack mojego teamu (start sesji, potem co jakiś czas)
node .claude/scripts/new-message.mjs --type handoff --to frontend --refs T-004,API-002 --title "..." --body "Wstęp\n\n## Zrobione\n- ..."
node .claude/scripts/new-message.mjs --type ack --to frontend --reply-to <id> --body "OK"
```

Wynikowy plik `.claude/sync/messages/<YYYYMMDD-HHMM>-<member-id>-<type>.md`:

```markdown
---
id: 20261116-2130-backend-1-contract_change
from: backend-1
to: frontend
type: contract_change
refs: [API-002, T-004]
requires_ack: false
---
Dodałem opcjonalne pole `avatarUrl` do odpowiedzi API-002. Nic nie psuje.
```

Potwierdzenie to **nowy** plik typu `ack` z polem `reply_to: <id>`. Nigdy nie edytuj cudzej wiadomości. Typy i wymagane potwierdzenia znajdziesz w `project.json → communication.message_types`. Discord idzie zawsze przez wspólny szablon z `communication.discord.template`, nigdy ręcznym `curl` (`new-message.mjs` robi to sam; ręcznie: `node .claude/scripts/discord-notify.mjs <plik> [--dry-run]`).

Sekcje `## Zrobione`, `## Potrzebuję od <team>` itd. w treści wiadomości stają się polami na Discordzie, a opcjonalne pole `title` we frontmatterze trafia do tytułu. Wzór: `communication.message_example`.

## Commity i hooki gita

Format: `<typ>(<zakres>): <opis> [<id-zadania>]`, np. `feat(api): GET /items z paginacją [T-002]`. ID zadania jest wymagane dla `feat`, `fix`, `refactor`, `test`, `perf`. Wiadomości sync i zmiany rezerwacji idą w tym samym commicie co zmiana, której dotyczą.

Hooki gita (`.githooks`, włącza je `check-tools`) sprawdzają każdy commit, także ręczny: sekrety (URI Mongo z hasłem, webhooki, klucze), pliki spoza `paths.write` teamu i cudze rezerwacje, zadanie `T-DB` przy zmianie bazy, spójność `tasks/`, `contracts/`, `.claude/sync/` (`validate.mjs`), format commita i **zamrożenie funkcji** (od 7:00 tylko `fix`, `docs`, `revert`). Gdy hook blokuje, popraw przyczynę z komunikatu. Nie używaj `--no-verify` bez zgody koordynatora. Kontrakty i zadania wzoruj na `_example` w `contracts/*.json` i `tasks/_TEMPLATE.json`.

Koordynator: `node .claude/scripts/status.mjs` pokazuje fazę, zadania wszystkich, blokery, `T-DB`, nieaktualne rezerwacje i wiadomości bez ack.

## Odpowiadaj po polsku, kod i commity po angielsku.
