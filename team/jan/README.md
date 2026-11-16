# Jan Mickiewicz: instrukcja dla Ciebie

**Twoja rola:** backend, **trudniejsze zadania backendowe** (`focus: complex`).
**Twój identyfikator:** `backend-1` · **team:** `backend` · **Twój główny agent:** `backend-lead`
**Czym się zajmujesz:** Logika biznesowa, auth, integracje z zewnętrznymi API i AI, złożone endpointy.

---

## 1. Start (raz, ok. 5 minut)

```bash
git clone <adres-repo> && cd <repo>
cp team/jan/settings.local.json .claude/settings.local.json
```

Otwórz `.claude/settings.local.json` i wklej adresy webhooków Discord (dostaniesz je od Kamila). Ten plik nie trafia do gita. Potem uruchom:

```bash
claude
```

Sesja od razu startuje z agentem `backend-lead`, bo tak ustawia Twój plik `settings.local.json`. Jeśli nie, uruchom `claude --agent backend-lead`.

> Bez skopiowania `settings.local.json` agent nie będzie mógł edytować plików: hook nie będzie wiedział, kim jesteś.

## 2. Twoi agenci

`backend-lead` prowadzi pracę i sam deleguje zadania do pomocników: be-database, be-api, be-integration, be-tester, be-reviewer. Nie musisz ich wywoływać ręcznie, ale możesz, np. „użyj agenta be-database do…”.

## 3. Gdzie możesz pisać

`apps/backend/**`, `database/**`, `contracts/api.json`, `contracts/data_model.json`, `tasks/**` (tylko status i notatki swoich zadań), `.claude/sync/**`

Hook zablokuje edycję poza Twoimi katalogami. To celowe. Agent wyśle wtedy wiadomość do właściciela pliku. Nie obchodź blokady.

## 4. Cykl pracy (powtarzaj)

1. Napisz: **„Weź moje następne zadanie.”** Agent robi `git pull --rebase`, czyta wiadomości, rezerwuje obszar i zaczyna.
2. Sprawdzaj, co robi, i testuj w przeglądarce lub curl-em.
3. Gdy część działa: **„Zrób commit i push.”**
4. Gdy zadanie skończone: **„Zamknij zadanie i zwolnij rezerwację.”**

## 5. Przykładowe polecenia

- „Weź moje następne zadanie.”
- „Zaimplementuj API-003 zgodnie z kontraktem.”
- „Podłącz zewnętrzne API X z timeoutem i fallbackiem na dane demo.”
- „Frontend pyta o pole X, odpowiedz i zaktualizuj kontrakt.”
- „Wyślij handoff dla API-003 do frontendu.”

## 6. Twój plan na 24h

| Godziny | Co robisz |
|---|---|
| 0–1,5h | przegląd kontraktu API, ocena ryzyk integracji |
| 1,5–3h | auth i pierwszy endpoint kroku demo |
| 3–16h | logika i integracje kolejnych kroków demo |
| 16–20h | wsparcie integracji z frontendem, poprawki |
| 20–24h (7:00–11:00) | zamrożenie funkcji: tylko poprawki błędów na ścieżce demo |
| 24h–15:15 | bez zmian w kodzie poza krytycznymi poprawkami prod; pokaz na żywo o 15:15 |

Start: sobota 21.11, 11:00. Kamień milowy: o 20:00 (9h) draft w HackTribe, więc repo i opis muszą być gotowe.

## 7. Zasady, które musisz znać

- Pracujemy na `main`. Małe commity, `git pull --rebase` przed każdym push.
- Liczy się tylko scenariusz demo (`project.json → project.concept.demo_scenario`).
- Stoisz ponad 20 minut? Napisz agentowi: „wyślij blocker do koordynatora” i weź inną część zadania.
- Wiadomości między teamami to pliki w `.claude/sync/messages/`. Agent je czyta i pisze za Ciebie.
- Pilne sprawy dodatkowo na Discordzie.

Pełne zasady: `CLAUDE.md` i `project.json`.
