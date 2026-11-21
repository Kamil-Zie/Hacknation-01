---
id: 20261121-1301-backend-2-contract_change
from: backend-2
to: frontend
type: contract_change
title: Kontrakt 0.3.0: era5land, wilgotność z ERA5-Land (Nataniel)
refs: [T-037, T-DB-006, API-004, API-006, DM-015]
requires_ack: false
---
Kontrakt 0.3.0 wg ADR-008 v2: wilgotność gleby z ERA5-Land, NASA POWER tylko zapas. Zmiany zgodne wstecz, raporty demo w bazie dev zaktualizowane.

## Zrobione
- Nowy sourceId `era5land` w enumach (DM-002, 005, 010, 011, 012); etykieta „Wilgotność gleby” należy teraz do era5land
- DM-015 opisuje ERA5-Land: valuePct = 0–7 cm, rootZonePct = 7–100 cm (średnia ważona), profilePct = 0–100 cm; nowe pola opcjonalne theta0to7M3, theta7to28M3, theta28to100M3, thetaFcM3, thetaWpM3 (m3/m3) i fallback (true, gdy dane z NASA POWER)
- `nasa_power` pojawia się w sources[] tylko wtedy, gdy zapas został użyty (pewność −0,05 i wpis w limitations); w przykładach go nie ma
- API-006: 9 źródeł, era5land z licencją Copernicus CC BY 4.0 i atrybucją
- Examples API-004 (201_complete, 201_partial) z wilgotnością z ERA5-Land (wartości ilustracyjne, Open-Meteo 429)

## Potrzebuję od frontend
- Dopiszcie era5land do typów i mapowania braków; przy fallback = true pokażcie, że to dane zapasowe NASA POWER (ok. 50 km), inaczej ERA5-Land (ok. 9 km)
