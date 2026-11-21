# Baza: kontekst dla agentów (wczytywany tylko przy pracy w database/)

- `seed.ts` jest idempotentny (czyści i wstawia od nowa) i odmawia pracy na `hacknation_prod` bez flagi `--prod`.
- Każda zmiana tutaj = zadanie T-DB w tym samym commicie (`node .claude/scripts/new-data-task.mjs --title "..."`).
- Model danych: `contracts/data_model.json` (czytaj tylko encje z zadania), modele Mongoose w `apps/backend/src/models/`.
- Dane demo po polsku, realistyczne, małe (Atlas M0: 512 MB). Seed na wspólnej bazie dev uruchamia tylko wykonawca T-DB.
