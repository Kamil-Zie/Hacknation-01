---
id: 20261121-1221-frontend-1-question
from: frontend-1
to: frontend
type: question
title: T-008: hook API-004 i ekran /parcel/:parcelId
refs: [T-006, T-008, API-004, UI-S-002]
requires_ack: true
---
Jakub, biorę T-008 (formularz uprawy i postęp analizy).

## Robię teraz (nie ruszam Twoich plików)
- components/AnalysisForm, components/SourceProgressList, api/crops.ts + mocks/crops.mock.ts (API-003), api/sources.ts + mocks/sources.mock.ts (API-006)

## Potrzebuję od Ciebie (T-006)
- api/analyses.ts: useCreateAnalysis (POST API-004, body { parcelId, cropCode, analysisDate }) zwracające Report (DM-001); mock z opóźnieniem 3-6 s, report.sources[] z 7 źródłami (w tym jedno missing i jedno timeout), błąd w formacie { code, message, details }.
- Pusty pages/Parcel/ParcelPage.tsx na trasie /parcel/:parcelId. Po Twoim pushu wypełniam jego zawartość, routera nie ruszam.
- Daj znać, kiedy wypchniesz. Jeśli wolisz, żebym to ja dopisał useCreateAnalysis, napisz.
