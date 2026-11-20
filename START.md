# START: jak zacząć pracę

Zakładamy, że masz już wszystko zainstalowane i skonfigurowane (repo, `.env`, `.claude/settings.local.json`, `check-tools` bez ❌).
Tu jest tylko to, **jak zacząć pracę i za co się zabrać**.

Start hackathonu: **sobota 21.11, 11:00**.

| Osoba | ID | Agent | Na start bierzesz |
|---|---|---|---|
| Kamil | `coord-1` | `coordinator` | koncepcja, stack, kontrakty, zadania |
| Dawid | `frontend-1` | `frontend-lead` | trudniejsze ekrany i logika frontu |
| Jakub | `frontend-2` | `frontend-lead` | wygląd, layout, komponenty |
| Jan | `backend-1` | `backend-lead` | trudniejsze endpointy, auth, integracje |
| Nataniel | `backend-2` | `backend-lead` | model danych, seed, endpointy CRUD |

---

## 1. Każda sesja zaczyna się tak samo

```bash
cd Hacknation-01
git pull --rebase
claude
```

Sesja startuje z Twoim agentem i sama uruchamia `check-tools`. Pierwsze zdanie do agenta:

> **„Pokaż status projektu i moją skrzynkę.”**

Agent pokaże fazę, Twoje zadania, blokery i wiadomości od innych teamów. **Najpierw odpowiadasz na wiadomości**, potem bierzesz pracę.

## 2. 11:00–12:30: koncepcja (jeszcze bez kodu)

O 11:00 poznajemy zadanie. Kamil z agentami ustala koncepcję, scenariusz demo, stack i kontrakty, a potem rozpisuje zadania. Pushuje je na `main` po kolei.

| Kto | Co robisz |
|---|---|
| **Wszyscy, 11:00–11:30** | czytacie treść zadania hackathonu, wrzucacie pomysły na Discord: co pokażemy jury w 3–5 krokach |
| **Frontend** | po pushu kontraktów: `git pull --rebase` → **„Przejrzyj contracts/ui.json i api.json pod kątem scenariusza demo i zgłoś braki koordynatorowi.”** |
| **Backend** | po pushu kontraktów: `git pull --rebase` → **„Przejrzyj contracts/api.json i data_model.json, zgłoś braki i ryzyka koordynatorowi.”** |

Uwagi do kontraktu agent wysyła wiadomością do Kamila. **Nie piszecie jeszcze kodu.**

## 3. ok. 12:30: pierwsze zadanie

Gdy Kamil ogłosi na Discordzie, że zadania i szkielet są na `main`:

```bash
git pull --rebase
npm install
npm run dev        # front: localhost:5173, API: localhost:3000/api/v1
```

Potem do agenta:

> **„Weź moje następne zadanie.”**

Agent sam:
1. znajduje w `tasks/` zadanie przypisane do Ciebie (`assignee` = Twoje ID) albo pierwsze wolne Twojego teamu, które ma spełnione `depends_on`;
2. czyta jego pełny opis: `description`, `demo_step`, `contract_refs`, `acceptance_criteria`;
3. rezerwuje obszar w `.claude/sync/claims/<twoje-id>.md` i ustawia status `in_progress`;
4. opowiada Ci plan i zaczyna.

Chcesz konkretne zadanie: **„Weź zadanie T-003.”**

## 4. Cykl pracy (powtarzasz do końca)

| Moment | Mówisz do agenta |
|---|---|
| Start zadania | „Weź moje następne zadanie.” |
| Część działa (sprawdzona w przeglądarce / curl-em) | „Zrób commit i push.” |
| Kryteria akceptacji spełnione | „Zamknij zadanie i zwolnij rezerwację.” |
| Backend skończył endpoint | „Wyślij handoff dla API-00X do frontendu.” |
| Frontend dostał handoff | „Przełącz ekran z mocka na prawdziwe API.” |
| Co ok. godzinę | „Sprawdź skrzynkę.” |
| Stoisz ponad **20 minut** | „Wyślij blocker do koordynatora.” i bierzesz inną część zadania |
| Potrzebujesz decyzji (biblioteka, zmiana zakresu) | „Wyślij decision_request do koordynatora.” |

**Pilnuj agenta:** czytaj, co robi, i sprawdzaj efekt na żywo. Agent robi szybko, ale to Ty odpowiadasz za to, że krok demo działa.

## 5. Jak pracujemy w parach

- **Frontend nie czeka na backend.** Ekran powstaje na mocku zgodnym z kontraktem. Po handoffie przełączacie go na API.
- **Pionowe plastry:** jeden krok demo od endpointu do ekranu, potem następny. Jan i Dawid biorą razem najtrudniejszy krok, Nataniel i Jakub resztę.
- **Zmiana kontraktu:** tylko przez agenta i wiadomość do drugiego teamu. Gdy zmiana psuje kompatybilność (`breaking_change`), drugi team musi ją najpierw potwierdzić.
- **Zmiana bazy:** agent tworzy zadanie `T-DB` w tym samym commicie. Seed na wspólnej bazie puszcza tylko jego wykonawca.

## 6. Zasady, których nie łamiemy

- Robimy **tylko kroki scenariusza demo**. Pomysł spoza niego idzie do Kamila, nie do kodu.
- Jedna gałąź `main`, małe commity, push po każdej działającej części.
- Blokada hooka jest celowa: nie obchodź jej i nie używaj `--no-verify`. Komunikat mówi, co poprawić.
- **Niedziela 7:00: zamrożenie funkcji.** Potem tylko poprawki błędów na ścieżce demo.

## Najważniejsze godziny

| Kiedy | Co |
|---|---|
| sob **11:00** | start, koncepcja |
| sob **~12:30** | zadania i szkielet na `main`, startuje budowa |
| sob **20:00** | draft w HackTribe |
| nd **03:00** | cały scenariusz na prawdziwym API |
| nd **07:00** | zamrożenie funkcji |
| nd **11:00** | oddanie materiałów |
| nd **15:15** | pokaz na żywo |

Szczegółowy plan godzin dla Ciebie: `team/<imie>/README.md`, sekcja „Twój plan na 24h”.
