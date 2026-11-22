---
id: 20261122-0820-frontend-1-decision_request
from: frontend-1
to: coordinator
type: decision_request
title: Logowanie wymagane, a README i ADR-010 obiecują analizę bez konta
refs: [T-081, UI-S-005, ADR-010]
requires_ack: true
---
Kamil, porównałem aplikację z treścią zadania KOWR. Po T-081 strona startowa, sprawdzenie działki i raport wymagają konta, a README (Dla jury, linia 15: Bez logowania), README linia 208 i ADR-010 pkt 5 mówią, że analiza działa bez konta.

## Ryzyko
- Etap 1: każdy juror musi się najpierw zarejestrować, a README mówi mu, że nie musi; to uderza w Prostotę obsługi (15%)
- Zadanie: bez zbierania danych osobowych, jeśli nie są potrzebne; wymuszone konto zbiera e-mail i imię

## Potrzebuję decyzji
- A: przywrócić analizę bez konta (/, /parcel/:id, raport); konto zostaje opcjonalne do pulpitu, historii, grup działek i Szybkiego raportu. Mogę to zrobić jako fix po zamrożeniu (RequireAuth tylko na trasach konta)
- B: zostawić logowanie, ale poprawić README (Dla jury) i podać jury gotowe konto testowe z danymi logowania

Dawid
