# Baza: kontekst dla agentów (wczytywany tylko przy pracy w database/)

- `seed.ts` jest idempotentny (upsert raportów demo po stałych `_id` 665f0c0ffee0000000000001/2, bez czyszczenia kolekcji, bo trzyma też raporty z analiz) i odmawia pracy na `hacknation_prod` bez flagi `--prod`.
- Każda zmiana tutaj = zadanie T-DB w tym samym commicie (`node .claude/scripts/new-data-task.mjs --title "..."`).
- Model danych: `contracts/data_model.json` (czytaj tylko encje z zadania), modele Mongoose w `apps/backend/src/models/`.
- Dane demo po polsku, realistyczne, małe (Atlas M0: 512 MB). Seed na wspólnej bazie dev uruchamia tylko wykonawca T-DB.
