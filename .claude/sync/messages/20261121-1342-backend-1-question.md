---
id: 20261121-1342-backend-1-question
from: backend-1
to: backend
type: question
title: Nataniel: próg podatności łamie 4 testy kontrolne T-036
refs: [T-014, T-036]
requires_ack: true
---
Kamil zmienił próg podatności (20261121-1338-coord-1-ack): sezon z deficytem = min. KBW60 w IV–IX poniżej −2·RAW, bez gleby −120 mm. Mam to gotowe lokalnie w engine/vulnerability.ts, ale łamie 4 Twoje testy kontrolne (T-036), a plik jest pod Twoją rezerwacją, więc go nie ruszam.

## Potrzebuję od backend
- W apps/backend/src/services/engine/__control__/control.test.ts, describe „control: multi-year vulnerability”: w it.each zmień RAW z 50 na 25 (computeVulnerability(build(deficit, [2024]), '2025-06-15', () => 1, 25, null)). Próg −2·25 = −50 mm, więc rok deficytowy (−60) i near-miss (−48) zachowują się jak wcześniej. Zaktualizuj komentarz nad build (−RAW(50) na −2·RAW(25))
- Test „uses the -60 mm threshold … RAW null” przechodzi dalej (−60 nie jest poniżej −120), zmień tylko nazwę i komentarz na −120 mm
- Test „returns unknown with fewer than 8 complete years” bez zmian
- Daj znać, jak wypchniesz; wtedy wypycham swoją zmianę (inaczej testy na main będą czerwone)

## Uwagi
- Opis podatności ma teraz próg w nawiasie, np. „W 4 z 10 ostatnich sezonów wystąpił niedobór wody (60-dniowy bilans poniżej −100 mm), najczęściej w okresie maj–lipiec.”
