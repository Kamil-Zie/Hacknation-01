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

Zmienna środowiskowa `HACK_MEMBER` (np. `frontend-1`) mówi, czyja to sesja. Team i uprawnienia znajdziesz w `project.json → teams`. Pliki spoza `paths.write` Twojego teamu blokuje hook `.claude/hooks/guard-paths.mjs`. Nie obchodź go (np. przez Bash `echo >`, `sed -i`). Jeśli potrzebujesz zmiany w cudzym obszarze, wyślij wiadomość.

## Stack

Do czasu decyzji (`technologies.status = "decided"`) nie zakładaj żadnego frameworka. Po decyzji używaj **tylko** wartości z pól `technologies.*.choice`. Nowa biblioteka spoza wyboru wymaga `decision_request` do koordynatora, chyba że jest drobna i lokalna (np. `date-fns`). Wtedy dopisz ją do notatek zadania.

## Zasady hackathonu (skrót, pełna lista w project.json)

1. Pracujemy tylko nad krokami `project.concept.demo_scenario`. Reszta czeka.
2. Pionowe plastry: jeden krok demo od endpointu do ekranu, potem następny.
3. Frontend startuje na mocku zgodnym z kontraktem i nie czeka na backend.
4. Gałąź `main`: małe commity, `git pull --rebase` przed każdym `push`, push po każdej działającej części.
5. Najprostsze rozwiązanie, które działa w demo. Bez abstrakcji i optymalizacji na zapas.
6. Stoisz ponad 20 minut: `blocker` do koordynatora i bierzesz inną część zadania.
7. Po zamrożeniu funkcji (faza 20–22,5h) tylko poprawki błędów na ścieżce demo.

## Wiadomości (bez narzędzi, zwykłe pliki)

Plik `.claude/sync/messages/<YYYYMMDD-HHMM>-<member-id>-<type>.md`:

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

Potwierdzenie to **nowy** plik typu `ack` z polem `reply_to: <id>`. Nigdy nie edytuj cudzej wiadomości. Typy i wymagane potwierdzenia znajdziesz w `project.json → communication.message_types`. Przy `breaking_change`, `blocker`, `decision_request` i `handoff` wyślij też powiadomienie na Discord (`communication.discord.send`), o ile webhook jest ustawiony.

## Commity

Format: `<typ>(<zakres>): <opis> [<id-zadania>]`, np. `feat(api): GET /items z paginacją [T-002]`. Wiadomości sync i zmiany rezerwacji idą w tym samym commicie co zmiana, której dotyczą.

## Odpowiadaj po polsku, kod i commity po angielsku.
