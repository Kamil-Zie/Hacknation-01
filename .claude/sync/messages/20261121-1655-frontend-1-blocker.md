---
id: 20261121-1655-frontend-1-blocker
from: frontend-1
to: coordinator
type: blocker
title: Atlas znowu odrzuca IP Dawida: nie da się przetestować kont na żywo
refs: [T-045, T-047, API-007, API-013]
requires_ack: true
---
Kamil, o 15:55 UTC backend lokalny u Dawida znowu dostaje: Could not connect to any servers in your MongoDB Atlas cluster ... IP that isn't whitelisted. IP Dawida zmienia się (sieć hackathonu), drugi raz dziś (pierwszy: 20261121-1330).

## Potrzebuję od koordynatora
- Network Access w Atlas: 0.0.0.0/0 na czas hackathonu (sekret i tak tylko w .env), żeby nie dopisywać IP co godzinę

## Wpływ
- Blokuje test na żywo T-045 (logowanie/rejestracja: POST /auth/register daje 500) i T-047 (zapis raportu w koncie, historia). Front jest gotowy i działa na mockach; backend kont (T-041, T-042, T-043) jest na main
