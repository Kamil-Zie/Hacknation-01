# Kamil Zieliński: instrukcja dla Ciebie

**Twoja rola:** koordynator i fullstack. Masz prawo zapisu w całym repo i jako jedyny zmieniasz `project.json`.
**Twój identyfikator:** `coord-1` · **team:** `coordinator` · **Twój główny agent:** `coordinator`
**Czym się zajmujesz:** Planowanie, koncepcja, architektura, rozstrzyganie sporów, wdrożenie i prezentacja. Możesz poprawić kod każdego teamu.

---

## 1. Start (raz, ok. 5 minut)

```bash
git clone <adres-repo> && cd <repo>
cp team/kamil/settings.local.json .claude/settings.local.json
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

Sesja od razu startuje z agentem `coordinator`, bo tak ustawia Twój plik `settings.local.json`. Jeśli nie, uruchom `claude --agent coordinator`.

> Bez skopiowania `settings.local.json` agent nie będzie mógł edytować plików: hook nie będzie wiedział, kim jesteś.

## 2. Twoi agenci

`coordinator` prowadzi pracę i sam deleguje zadania do pomocników: coord-concept, coord-task-planner, coord-architect, coord-integration-reviewer, coord-security, coord-docs, coord-devops. Nie musisz ich wywoływać ręcznie, ale możesz, np. „użyj agenta coord-concept do…”.

## 3. Gdzie możesz pisać

całe repo (`**`)

Jako koordynator możesz edytować wszystko, ale zanim poprawisz cudzy kod, sprawdź `.claude/sync/claims/` i uprzedź właściciela. Commit z zakresem `coord`, np. `fix(coord): ...`.

## 4. Cykl pracy (powtarzaj)

1. Napisz: **„Weź moje następne zadanie.”** Agent robi `git pull --rebase`, czyta wiadomości, rezerwuje obszar i zaczyna.
2. Sprawdzaj, co robi, i testuj w przeglądarce lub curl-em.
3. Gdy część działa: **„Zrób commit i push.”**
4. Gdy zadanie skończone: **„Zamknij zadanie i zwolnij rezerwację.”**

## 5. Przykładowe polecenia

- „Oto treść zadania i regulamin: <wklej>. Uzupełnij koncepcję i scenariusz demo.”
- „Wybierz stack i zaprojektuj kontrakty dla kroków demo.”
- „Rozpisz zadania i przydziel je zespołowi.”
- „Postaw szkielet repo według wybranego stacku.”
- „Sprawdź, które kroki demo działają na main.”
- „Popraw błąd w apps/frontend/... (poprawka koordynatora, uprzedź właściciela).”
- „Przygotuj README, scenariusz prezentacji i treść slajdów.”

## 6. Twój plan na 24h

| Godziny | Co robisz |
|---|---|
| 0–1,5h (11:00–12:30) | koncepcja, stack, kontrakty, zadania |
| 1,5–3h | szkielet repo, aplikacja startuje u wszystkich |
| 3–16h | blokery i decision_request, review integracji co 1–2h; do 20:00 (9h) draft w HackTribe: repo i opis gotowe |
| 16–20h | integracja całego scenariusza, przegląd bezpieczeństwa |
| 20–24h (7:00–11:00) | zamrożenie funkcji; prezentacja, wideo do 2 min, README dla jurorów |
| 11:00–15:15 | prod stabilny, próba pokazu; pokaz na żywo o 15:15 |

## 7. Zasady, które musisz znać

- Pracujemy na `main`. Małe commity, `git pull --rebase` przed każdym push.
- Liczy się tylko scenariusz demo (`project.json → project.concept.demo_scenario`).
- Stoisz ponad 20 minut? Napisz agentowi: „wyślij blocker do koordynatora” i weź inną część zadania.
- Wiadomości między teamami to pliki w `.claude/sync/messages/`. Agent je czyta i pisze za Ciebie.
- Pilne sprawy dodatkowo na Discordzie.

Pełne zasady: `CLAUDE.md` i `project.json`.
