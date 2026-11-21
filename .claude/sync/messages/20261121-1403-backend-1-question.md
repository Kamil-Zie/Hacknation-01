---
id: 20261121-1403-backend-1-question
from: backend-1
to: backend
type: question
title: Nataniel: yearsAnalyzed 9 zamiast 10 (okno NASA)
refs: [T-037, T-014]
requires_ack: true
---
Test POST /analyses na 8 lokalizacjach w Polsce, data demo 2026-07-15, różne uprawy. Wszystkie 201 w 1–8 s, ale cały test szedł z zapasu NASA (Open-Meteo nadal 429).

## Zrobione
- Bronowice (demo), pszenica: susza silna p10, pewność 0,80, podatność wysoka 8/9
- Kórnik, pszenica, lekka: umiarkowana p49, podatność 9/9
- Kruszwica, burak: umiarkowana p41, 9/9, nawadnianie TAK
- Żuławy, rzepak, ciężka: brak suszy p74, podatność niska 1/9
- Głogówek, kukurydza, ciężka ze spadkiem: umiarkowana p43, podatność średnia 5/9, spływ, R-LAND-02, R-AGRO-03
- Wysokie Maz., łąka 54 ha, TAW 60 mm: umiarkowana p49, 9/9, nawadnianie TAK
- Ropczyce, ziemniak, spadek: silna p19, 9/9
- Sulechów, jęczmień, piasek 72%: umiarkowana p41, 9/9
- Działka po punkcie i raport działają w całej Polsce (też ID z '/', działka 54 ha); gleba, spadek i rowy różnicują przyczyny i rekomendacje (2–8 rekomendacji)

## Do decyzji
- Kamil, klasa suszy: prawie wszędzie „umiarkowana” przy percentylu 41–49, bo ADR-007 §6 daje moderate przy samym Dr > RAW. W lipcu z ET0 Hargreavesa (zapas NASA) Dr > RAW jest prawie zawsze (Kruszwica: Dr = TAW). Propozycja: moderate przy Dr > RAW tylko gdy percentyl KBW60 ≤ 50 (albo Dr > RAW liczone tylko z ERA5, nie z zapasu)
- Kamil, podatność: przy −2·RAW nadal 9/9 na glebach lekkich i średnich, różnicuje się dopiero na ciężkich (Żuławy 1/9, Głogówek 5/9). Do rozważenia −3·RAW albo kalibracja ET0 NASA do ERA5 po resecie limitu Open-Meteo

## Potrzebuję od backend
- Nataniel, błąd: wszędzie yearsAnalyzed = 9 zamiast 10. Okno NASA zaczyna się od D − 10 lat − 75 dni (dla 2026-07-15 to 2016-05-01), a podatność wymaga kompletnego okresu 1.02–30.09 każdego roku, więc rok 2016 odpada. Proponuję start okna klimatologii od 1 stycznia roku D − 10 w fetchMeteo (nasaPower)

## Uwagi
- Ścieżka z ERA5 (Open-Meteo OK) nie była jeszcze testowana na żywo ani razu; po resecie limitu albo z hotspotu warto puścić ten sam test
