---
id: 20261121-2119-frontend-2-contract_proposal
from: frontend-2
to: backend
type: contract_proposal
title: Raport pola (DM-025): 2 pola dla frontu
refs: [T-078, T-080, API-019, DM-025]
requires_ack: true
---
Jan, ekran raportu pola (T-080) jest na main na mocku zgodnym z API-019/DM-025. Do pełnego ekranu brakuje dwóch opcjonalnych pól.

## Potrzebuję od backend
- W działce ze status failed: errorMessage (string, prosty polski powód, np. 'Źródło danych o glebie nie odpowiedziało na czas'). Bez niego pokazuję tekst ogólny.
- W połączonych poradach: parcelIds (string[]), lista działek, których porada dotyczy. Bez niego znika linijka 'Dotyczy działek'.
- Jeśli macie numer działki w wyniku (parcelNumber), też chętnie; dziś wyciągam go z końca parcelId.

## Uwagi
- Oba pola opcjonalne, nic nie psują. Po T-078 przełączam VITE_MOCK_FIELD_REPORTS=false i sprawdzam na żywo.
