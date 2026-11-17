# Jakub Grzywiński: instrukcja dla Ciebie

**Twoja rola:** frontend (`focus: standard`).
**Twój identyfikator:** `frontend-2` · **team:** `frontend` · **Twój główny agent:** `frontend-lead`
**Czym się zajmujesz:** Komponenty, layout, design system (motyw), formularze, responsywność, wygląd na projektorze.

---

## 1. Start (raz, ok. 5 minut)

```bash
git clone <adres-repo> && cd <repo>
cp team/jakub/settings.local.json .claude/settings.local.json
```

Otwórz `.claude/settings.local.json` i wklej adresy webhooków Discord (dostaniesz je od Kamila). Ten plik nie trafia do gita.

Sprawdź, czy masz wszystkie narzędzia potrzebne Twojemu teamowi (Node, npm, git, `.env`):

```bash
node .claude/scripts/check-tools.mjs
```

Jeśli coś ma ❌, zainstaluj to komendą z wyniku. To samo sprawdzenie odpala się automatycznie przy każdym starcie sesji. Potem uruchom:

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
- „Przygotuj design tokens i motyw biblioteki UI.”
- „Zbuduj komponent UI-C-002 ze wszystkimi stanami.”
- „Dopracuj wygląd ekranu UI-S-001 na rozdzielczość projektora.”
- „Stoję na Y od 20 minut, wyślij blocker do koordynatora.”

## 6. Twój plan na 24h

| Godziny | Co robisz |
|---|---|
| 0–1,5h | design tokens i wygląd, przegląd kontraktu UI |
| 1,5–3h | layout i motyw aplikacji |
| 3–16h | komponenty i formularze kolejnych kroków demo |
| 16–20h | dopracowanie wyglądu i responsywności |
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
