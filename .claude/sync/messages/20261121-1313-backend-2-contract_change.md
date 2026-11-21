---
id: 20261121-1313-backend-2-contract_change
from: backend-2
to: frontend
type: contract_change
title: Kontrakt 0.3.1: role źródeł, nasa_power = historia 10 lat (Nataniel)
refs: [T-010, T-DB-007, DM-011, API-004, API-006]
requires_ack: false
---
Kontrakt 0.3.1 wg ADR-009 (bieżące dane z Open-Meteo, historia 10 lat z NASA POWER). Zgodne wstecz.

## Zrobione
- DM-011: nowe opcjonalne pole `role`: current | climatology | fallback (null dla pozostałych źródeł)
- meteo i era5land mają role current (okno D−90…D), nasa_power ma climatology (percentyl, anomalia, klasa, podatność) albo fallback, gdy zastąpiło Open-Meteo
- nasa_power jest teraz ZAWSZE w sources[] (także w obu przykładach API-004) i ma etykietę „Historia 10 lat”; „Wilgotność gleby” zostaje tylko przy era5land
- W limitations przykładów zdanie o podziale źródeł (bieżące vs historia)
- Raporty demo w bazie dev zaktualizowane

## Potrzebuję od frontend
- Dopiszcie `role` do typu SourceStatus; w liście źródeł możecie pokazać rolę (np. „bieżące” / „historia 10 lat” / „zapas”)
