# Dawid Jurek: instrukcja dla Ciebie

**Twoja rola:** frontend, **trudniejsze zadania frontendowe** (`focus: complex`).
**Twój identyfikator:** `frontend-1` · **team:** `frontend` · **Twój główny agent:** `frontend-lead`
**Czym się zajmujesz:** Stan aplikacji, routing, integracja z API, złożone widoki i interakcje.

---

## 1. Start (raz, ok. 5 minut)

```bash
git clone <adres-repo> && cd <repo>
cp team/dawid/settings.local.json .claude/settings.local.json
```

Otwórz `.claude/settings.local.json` i wklej adresy webhooków Discord (dostaniesz je od Kamila). Ten plik nie trafia do gita. Potem uruchom:

```bash
claude
```

Sesja od razu startuje z agentem `frontend-lead`, bo tak ustawia Twój plik `settings.local.json`. Jeśli nie, uruchom `claude --agent frontend-lead`.

> Bez skopiowania `settings.local.json` agent nie będzie mógł edytować plików: hook nie będzie wiedział, kim jesteś.

## 2. Twoi agenci

`frontend-lead` prowadzi pracę i sam deleguje zadania do pomocników: fe-uiux, fe-developer, fe-integration, fe-tester, fe-reviewer. Nie musisz ich wywoływać ręcznie, ale możesz, np. „użyj agenta fe-uiux do…”.

## 3. Gdzie możesz pisać

`apps/frontend/**`, `contracts/ui.json`, `tasks/**` (tylko status i notatki swoich zadań), `.claude/sync/**`

Hook zablokuje edycję poza Twoimi katalogami. To celowe. Agent wyśle wtedy wiadomość do właściciela pliku. Nie obchodź blokady.

## 4. Cykl pracy (powtarzaj)

1. Napisz: **„Weź moje następne zadanie.”** Agent robi `git pull --rebase`, czyta wiadomości, rezerwuje obszar i zaczyna.
2. Sprawdzaj, co robi, i testuj w przeglądarce lub curl-em.
3. Gdy część działa: **„Zrób commit i push.”**
4. Gdy zadanie skończone: **„Zamknij zadanie i zwolnij rezerwację.”**

## 5. Przykładowe polecenia

- „Weź moje następne zadanie.”
- „Zrób krok demo 2 na mocku zgodnym z kontraktem.”
- „Backend wysłał handoff dla API-003, przełącz ekran na prawdziwe API.”
- „Brakuje pola X w API-002, wyślij propozycję zmiany do backendu.”
- „Stoję na Y od 20 minut, wyślij blocker do koordynatora.”

## 6. Twój plan na 24h

| Godziny | Co robisz |
|---|---|
| 0–1,5h | przegląd kontraktu UI i API, zgłoś braki |
| 1,5–3h | routing, klient API, mocki, pierwszy krok demo |
| 3–16h | złożone ekrany i logika kolejnych kroków demo |
| 16–20h | przełączenie wszystkich kroków na prawdziwe API |
| 20–22,5h | tylko poprawki błędów na ścieżce demo |
| 22,5–24h | bez zmian w kodzie |

## 7. Zasady, które musisz znać

- Pracujemy na `main`. Małe commity, `git pull --rebase` przed każdym push.
- Liczy się tylko scenariusz demo (`project.json → project.concept.demo_scenario`).
- Stoisz ponad 20 minut? Napisz agentowi: „wyślij blocker do koordynatora” i weź inną część zadania.
- Wiadomości między teamami to pliki w `.claude/sync/messages/`. Agent je czyta i pisze za Ciebie.
- Pilne sprawy dodatkowo na Discordzie.

Pełne zasady: `CLAUDE.md` i `project.json`.
