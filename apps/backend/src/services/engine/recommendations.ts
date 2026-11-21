// T-016 DM-009 Recommendations engine: R-* rules in fixed category order (ADR-007 §9)
import type { DroughtClass, Evidence } from './classify.js';
import type { CausesTerrain } from './causes.js';
import { getStageForDate } from './crops.js';
import type { Crop, CropCode } from './crops.js';
import { fmt } from './format.js';
import type { VulnerabilityClass, VulnerabilitySoil } from './vulnerability.js';

export type RecommendationCategory =
  'retention_landscape' | 'retention_soil' | 'agrotechnics' | 'irrigation';

export type RecommendationPriority = 'high' | 'medium' | 'low';

export type LatLon = { lat: number; lon: number };

export type RecommendationIrrigation = {
  isJustified: boolean;
  netDoseMm: number | null;
  grossDoseMm: number | null;
  doseM3PerHa: number | null;
  window: string | null;
  nextCheckInDays: number | null;
};

export type Recommendation = {
  ruleId: string;
  category: RecommendationCategory;
  order: number;
  priority: RecommendationPriority;
  title: string;
  action: string;
  where: string | null;
  when: string | null;
  why: string;
  location: LatLon | null;
  irrigation: RecommendationIrrigation | null;
  evidence: Evidence[];
};

export type RecommendationsTerrain = CausesTerrain & { lowestPoint: LatLon | null };

export type RecommendationsHydro = {
  nearestDitchDistanceM: number | null;
  nearestDitchPoint: LatLon | null;
  hasReservoirWithin1km: boolean;
};

export type RecommendationsInput = {
  analysisDate: string;
  crop: Crop;
  areaHa: number;
  centroid: LatLon;
  droughtClass: DroughtClass;
  vulnerability: {
    vulnerabilityClass: VulnerabilityClass;
    criticalMonths: number[];
    criticalMonthsLabel: string | null;
  };
  soil: VulnerabilitySoil | null;
  tawMm: number | null;
  rawMm: number | null;
  depletionMm: number | null;
  terrain: RecommendationsTerrain | null;
  hydro: RecommendationsHydro | null;
  etc7DayMeanMm: number | null;
};

type Draft = Omit<Recommendation, 'order'>;

// ADR-007 §9 conditions.
const DITCH_MAX_DISTANCE_M = 300;
const BUFFER_MIN_SLOPE_PCT = 2;
const POND_MIN_AREA_HA = 1;
const POND_MIN_SLOPE_PCT = 1;
const SOC_LOW_PCT = 1.5;
const TAW_LOW_MM = 100;
const ACROSS_SLOPE_MIN_PCT = 3;
const IRRIGATION_FIRST_MONTH = 4;
const IRRIGATION_LAST_MONTH = 9;
const IRRIGATION_EFFICIENCY = 0.75;
const M3_PER_HA_PER_MM = 10;
// Coordinator decision (ack 20261121-1328): net dose per application capped at 30 mm.
const MAX_NET_DOSE_PER_APPLICATION_MM = 30;
const WATER_PERMIT_NOTE = 'Pobór wody powyżej 5 m³/dobę wymaga zgody wodnoprawnej (Prawo wodne).';
const IRRIGATION_WINDOW = 'najbliższe 3–5 dni, rano lub wieczorem';
const SUMMER_HARVEST_CROPS: CropCode[] = [
  'winter_wheat',
  'spring_barley',
  'winter_rapeseed',
  'potato',
];

// Priority thresholds (not defined by ADR-007, simple project assumptions):
// high when the rule follows from vulnerability high, drought severe, slope >= 5% or very low
// SOC/TAW; medium for vulnerability/drought medium-level triggers and slope >= 3%; low otherwise.
const SLOPE_HIGH_PCT = 5;
const SOC_VERY_LOW_PCT = 1;
const TAW_VERY_LOW_MM = 60;

const SOILGRIDS_VERSION = 'SoilGrids 2.0';
const ELEVATION_VERSION = 'Copernicus DEM';
const DROUGHT_LABEL: Record<DroughtClass, string> = {
  none: 'brak suszy',
  moderate: 'susza umiarkowana',
  severe: 'susza silna',
  unknown: 'brak danych',
};
const VULNERABILITY_LABEL: Record<VulnerabilityClass, string> = {
  low: 'niska',
  medium: 'średnia',
  high: 'wysoka',
  unknown: 'nieznana',
};
const ASPECT_ADJECTIVE: Record<string, string> = {
  N: 'północnej',
  NE: 'północno-wschodniej',
  E: 'wschodniej',
  SE: 'południowo-wschodniej',
  S: 'południowej',
  SW: 'południowo-zachodniej',
  W: 'zachodniej',
  NW: 'północno-zachodniej',
  // Names produced by the elevation source (direction the terrain falls towards).
  północ: 'północnej',
  'północny wschód': 'północno-wschodniej',
  wschód: 'wschodniej',
  'południowy wschód': 'południowo-wschodniej',
  południe: 'południowej',
  'południowy zachód': 'południowo-zachodniej',
  zachód: 'zachodniej',
  'północny zachód': 'północno-zachodniej',
};

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isVulnerabilityMediumOrHigh(input: RecommendationsInput): boolean {
  const cls = input.vulnerability.vulnerabilityClass;
  return cls === 'medium' || cls === 'high';
}

function isLightSoil(soil: VulnerabilitySoil | null): boolean {
  return soil !== null && (soil.category === 'light' || soil.category === 'very_light');
}

function vulnerabilityEvidence(input: RecommendationsInput): Evidence {
  const { criticalMonthsLabel } = input.vulnerability;
  return {
    label: 'Podatność wieloletnia na suszę',
    value: input.vulnerability.vulnerabilityClass,
    unit: null,
    sourceId: 'engine',
    dataDate: input.analysisDate,
    note: criticalMonthsLabel ? `miesiące krytyczne: ${criticalMonthsLabel}` : null,
  };
}

function droughtEvidence(input: RecommendationsInput): Evidence {
  return {
    label: 'Klasa suszy',
    value: input.droughtClass,
    unit: null,
    sourceId: 'engine',
    dataDate: input.analysisDate,
  };
}

function slopeEvidence(terrain: RecommendationsTerrain): Evidence {
  return {
    label: 'Spadek terenu',
    value: round(terrain.slopePct),
    unit: '%',
    sourceId: 'elevation',
    dataDate: ELEVATION_VERSION,
  };
}

function vulnerabilityText(input: RecommendationsInput): string {
  const { vulnerabilityClass, criticalMonthsLabel } = input.vulnerability;
  const months = criticalMonthsLabel ? `, miesiące krytyczne: ${criticalMonthsLabel}` : '';
  return `podatność wieloletnia na suszę jest ${VULNERABILITY_LABEL[vulnerabilityClass]} (analiza 10 lat do ${input.analysisDate})${months}`;
}

function aspectWhere(aspect: string | null): string {
  const adjective = aspect
    ? (ASPECT_ADJECTIVE[aspect.toLowerCase()] ?? ASPECT_ADJECTIVE[aspect.toUpperCase()])
    : undefined;
  return adjective
    ? `wzdłuż ${adjective} granicy działki (w dół spadku)`
    : 'w dolnej części działki (w dół spadku)';
}

function ditchRule(input: RecommendationsInput): Draft | null {
  const { hydro } = input;
  if (!hydro || hydro.nearestDitchDistanceM === null) return null;
  if (hydro.nearestDitchDistanceM > DITCH_MAX_DISTANCE_M || !isVulnerabilityMediumOrHigh(input)) {
    return null;
  }
  const distance = hydro.nearestDitchDistanceM;
  return {
    ruleId: 'R-LAND-01',
    category: 'retention_landscape',
    priority: input.vulnerability.vulnerabilityClass === 'high' ? 'high' : 'medium',
    title: 'Zastawka lub spowolnienie odpływu w rowie',
    action:
      'Zamontuj zastawkę lub próg piętrzący w najbliższym rowie, żeby zatrzymać wodę po opadach zamiast odprowadzać ją z okolicy pola.',
    where: `najbliższy odcinek rowu, ok. ${fmt(distance, 0)} m od działki`,
    when: 'poza sezonem wegetacji, przed wiosennymi roztopami',
    why: `Rów lub ciek leży ${fmt(distance, 0)} m od działki (próg ${DITCH_MAX_DISTANCE_M} m), a ${vulnerabilityText(input)}. Spowolnienie odpływu podnosi poziom wody w otoczeniu pola.`,
    location: hydro.nearestDitchPoint ?? input.centroid,
    irrigation: null,
    evidence: [
      {
        label: 'Odległość do najbliższego rowu lub cieku',
        value: round(distance, 0),
        unit: 'm',
        sourceId: 'overpass',
        dataDate: input.analysisDate,
      },
      vulnerabilityEvidence(input),
    ],
  };
}

function bufferRule(input: RecommendationsInput): Draft | null {
  const { terrain } = input;
  if (!terrain || terrain.slopePct < BUFFER_MIN_SLOPE_PCT) return null;
  const aspectNote = terrain.aspect ? `, kierunek spadku: ${terrain.aspect}` : '';
  return {
    ruleId: 'R-LAND-02',
    category: 'retention_landscape',
    priority: terrain.slopePct >= SLOPE_HIGH_PCT ? 'high' : 'medium',
    title: 'Strefa buforowa lub pas zadrzewień',
    action:
      'Wysiej pas trawiasty lub zadrzewienie śródpolne w dolnej części działki, żeby zatrzymać spływającą wodę i glebę.',
    where: aspectWhere(terrain.aspect),
    when: 'jesienią lub wczesną wiosną, przed siewem uprawy',
    why: `Spadek terenu wynosi ${fmt(terrain.slopePct)}% (próg ${BUFFER_MIN_SLOPE_PCT}%)${aspectNote}, więc woda opadowa spływa z działki zamiast wsiąkać. Pas w dolnej części spowalnia spływ.`,
    location: terrain.lowestPoint ?? input.centroid,
    irrigation: null,
    evidence: [slopeEvidence(terrain)],
  };
}

function pondRule(input: RecommendationsInput): Draft | null {
  const { hydro, terrain } = input;
  if (!hydro || !terrain || hydro.hasReservoirWithin1km) return null;
  if (input.areaHa < POND_MIN_AREA_HA || terrain.slopePct < POND_MIN_SLOPE_PCT) return null;
  const isUrgent =
    input.vulnerability.vulnerabilityClass === 'high' || input.droughtClass === 'severe';
  return {
    ruleId: 'R-LAND-03',
    category: 'retention_landscape',
    priority: isUrgent ? 'medium' : 'low',
    title: 'Oczko wodne lub mały zbiornik retencyjny',
    action:
      'Rozważ oczko wodne lub mały zbiornik w najniższym miejscu działki, który zbierze wodę spływającą z pola.',
    where: 'najniższy punkt działki',
    when: 'poza sezonem wegetacji, po uzgodnieniach formalnych',
    why: `W promieniu 1 km nie ma zbiornika wodnego (OSM), działka ma ${fmt(input.areaHa, 2)} ha (próg ${POND_MIN_AREA_HA} ha), a spadek wynosi ${fmt(terrain.slopePct)}%. Zbiornik w najniższym miejscu zatrzyma spływającą wodę.`,
    location: terrain.lowestPoint,
    irrigation: null,
    evidence: [
      {
        label: 'Zbiorniki wodne w promieniu 1 km',
        value: 0,
        unit: 'szt.',
        sourceId: 'overpass',
        dataDate: input.analysisDate,
      },
      {
        label: 'Powierzchnia działki',
        value: round(input.areaHa, 2),
        unit: 'ha',
        sourceId: 'uldk',
        dataDate: input.analysisDate,
      },
      slopeEvidence(terrain),
    ],
  };
}

function organicMatterRule(input: RecommendationsInput): Draft | null {
  const { soil, tawMm } = input;
  const lowSoc = soil !== null && soil.socPct < SOC_LOW_PCT;
  const lowTaw = tawMm !== null && tawMm < TAW_LOW_MM;
  if (!lowSoc && !lowTaw) return null;

  const evidence: Evidence[] = [];
  const facts: string[] = [];
  if (soil && lowSoc) {
    facts.push(
      `zawartość węgla organicznego (SOC) to ${fmt(soil.socPct, 2)}% (próg ${fmt(SOC_LOW_PCT)}%)`,
    );
    evidence.push({
      label: 'Węgiel organiczny (SOC)',
      value: round(soil.socPct, 2),
      unit: '%',
      sourceId: 'soilgrids',
      dataDate: SOILGRIDS_VERSION,
    });
  }
  if (tawMm !== null && lowTaw) {
    facts.push(`gleba zatrzymuje tylko ${fmt(tawMm, 0)} mm dostępnej wody (próg ${TAW_LOW_MM} mm)`);
    evidence.push({
      label: 'Dostępna woda w strefie korzeni (TAW)',
      value: round(tawMm, 0),
      unit: 'mm',
      sourceId: 'engine',
      dataDate: SOILGRIDS_VERSION,
    });
  }
  const isVeryLow =
    (soil !== null && soil.socPct < SOC_VERY_LOW_PCT) ||
    (tawMm !== null && tawMm < TAW_VERY_LOW_MM);
  return {
    ruleId: 'R-SOIL-01',
    category: 'retention_soil',
    priority: isVeryLow ? 'high' : 'medium',
    title: 'Zwiększanie materii organicznej w glebie',
    action:
      'Wprowadź obornik, kompost lub przyorywanie słomy, żeby podnieść zawartość próchnicy i zdolność gleby do zatrzymywania wody.',
    where: 'cała działka',
    when: 'po zbiorze, przed uprawą przedsiewną',
    why: `Na tej działce ${facts.join(', a ')}. Więcej materii organicznej zwiększa pojemność wodną gleby.`,
    location: input.centroid,
    irrigation: null,
    evidence,
  };
}

function coverCropRule(input: RecommendationsInput): Draft | null {
  if (!isVulnerabilityMediumOrHigh(input) || !SUMMER_HARVEST_CROPS.includes(input.crop.code)) {
    return null;
  }
  return {
    ruleId: 'R-SOIL-02',
    category: 'retention_soil',
    priority: input.vulnerability.vulnerabilityClass === 'high' ? 'high' : 'medium',
    title: 'Międzyplony po zbiorze',
    action:
      'Wysiej międzyplon (np. facelia, gorczyca, mieszanka motylkowych) zaraz po zbiorze, żeby okryć glebę i poprawić jej strukturę.',
    where: 'cała działka po zbiorze uprawy',
    when: 'bezpośrednio po zbiorze (lipiec–sierpień)',
    why: `Uprawa (${input.crop.name}) jest zbierana latem, a ${vulnerabilityText(input)}. Międzyplon chroni odkrytą glebę przed parowaniem i spływem.`,
    location: input.centroid,
    irrigation: null,
    evidence: [
      vulnerabilityEvidence(input),
      {
        label: 'Uprawa zbierana latem',
        value: input.crop.name,
        unit: null,
        sourceId: 'engine',
        dataDate: input.analysisDate,
      },
    ],
  };
}

function residueRule(input: RecommendationsInput): Draft | null {
  const isDry = input.droughtClass === 'moderate' || input.droughtClass === 'severe';
  const { soil } = input;
  if (!isDry && !isLightSoil(soil)) return null;

  const facts = [`klasa suszy: ${DROUGHT_LABEL[input.droughtClass]}`];
  const evidence: Evidence[] = [droughtEvidence(input)];
  if (soil && isLightSoil(soil)) {
    facts.push(`gleba lekka (${fmt(soil.sandPct, 0)}% piasku)`);
    evidence.push({
      label: 'Udział piasku',
      value: round(soil.sandPct, 0),
      unit: '%',
      sourceId: 'soilgrids',
      dataDate: SOILGRIDS_VERSION,
    });
  }
  return {
    ruleId: 'R-AGRO-01',
    category: 'agrotechnics',
    priority: input.droughtClass === 'severe' ? 'high' : 'medium',
    title: 'Resztki pożniwne i mulcz zamiast odkrytej gleby',
    action:
      'Pozostaw resztki pożniwne lub rozłóż mulcz, żeby ograniczyć parowanie z powierzchni gleby.',
    where: 'cała działka',
    when: 'po zbiorze i w trakcie wegetacji',
    why: `Stan na ${input.analysisDate}: ${facts.join(', ')}. Okrywa z resztek zmniejsza parowanie z odkrytej gleby.`,
    location: input.centroid,
    irrigation: null,
    evidence,
  };
}

function reducedTillageRule(input: RecommendationsInput): Draft | null {
  const { soil } = input;
  if (!soil || !isLightSoil(soil) || !isVulnerabilityMediumOrHigh(input)) return null;
  return {
    ruleId: 'R-AGRO-02',
    category: 'agrotechnics',
    priority: input.vulnerability.vulnerabilityClass === 'high' ? 'high' : 'medium',
    title: 'Uprawa uproszczona, bez głębokiej orki przed siewem',
    action:
      'Ogranicz głęboką orkę przed siewem i zastosuj uprawę uproszczoną, żeby nie wysuszać górnej warstwy gleby.',
    where: 'cała działka',
    when: 'przed siewem',
    why: `Gleba jest lekka (${fmt(soil.sandPct, 0)}% piasku), a ${vulnerabilityText(input)}. Głęboka orka przesusza glebę, która i tak słabo zatrzymuje wodę.`,
    location: input.centroid,
    irrigation: null,
    evidence: [
      {
        label: 'Udział piasku',
        value: round(soil.sandPct, 0),
        unit: '%',
        sourceId: 'soilgrids',
        dataDate: SOILGRIDS_VERSION,
      },
      vulnerabilityEvidence(input),
    ],
  };
}

function acrossSlopeRule(input: RecommendationsInput): Draft | null {
  const { terrain } = input;
  if (!terrain || terrain.slopePct < ACROSS_SLOPE_MIN_PCT) return null;
  return {
    ruleId: 'R-AGRO-03',
    category: 'agrotechnics',
    priority: terrain.slopePct >= SLOPE_HIGH_PCT ? 'high' : 'medium',
    title: 'Uprawa w poprzek stoku',
    action:
      'Prowadź orkę, siew i zabiegi w poprzek stoku (wzdłuż poziomic), żeby bruzdy zatrzymywały wodę.',
    where: terrain.aspect
      ? `rzędy prostopadle do kierunku spadku (${terrain.aspect})`
      : 'rzędy prostopadle do kierunku spadku',
    when: 'przy każdym zabiegu uprawowym',
    why: `Spadek terenu wynosi ${fmt(terrain.slopePct)}% (próg ${ACROSS_SLOPE_MIN_PCT}%). Uprawa w poprzek stoku ogranicza spływ powierzchniowy.`,
    location: input.centroid,
    irrigation: null,
    evidence: [slopeEvidence(terrain)],
  };
}

function monitoringRule(input: RecommendationsInput): Draft | null {
  const { criticalMonths, criticalMonthsLabel } = input.vulnerability;
  if (criticalMonths.length === 0) return null;
  const label = criticalMonthsLabel ?? criticalMonths.join(', ');
  return {
    ruleId: 'R-AGRO-04',
    category: 'agrotechnics',
    priority: isVulnerabilityMediumOrHigh(input) ? 'medium' : 'low',
    title: 'Monitoring wilgotności w miesiącach krytycznych',
    action:
      'W miesiącach krytycznych sprawdzaj wilgotność gleby i stan roślin co tydzień oraz ponawiaj analizę.',
    where: 'cała działka',
    when: `miesiące krytyczne: ${label}`,
    why: `Z analizy 10 lat wynika ${criticalMonths.length} mies. o największym ryzyku deficytu wody (${label}). W tym czasie niedobór szybko odbija się na plonie.`,
    location: null,
    irrigation: null,
    evidence: [
      {
        label: 'Miesiące krytyczne',
        value: label,
        unit: null,
        sourceId: 'engine',
        dataDate: input.analysisDate,
        note: `liczba miesięcy: ${criticalMonths.length}`,
      },
    ],
  };
}

// Reasons why irrigation is not justified now, each with numbers from the input.
function irrigationBlockers(input: RecommendationsInput): string[] {
  const { depletionMm, rawMm, analysisDate } = input;
  const reasons: string[] = [];
  if (input.droughtClass !== 'moderate' && input.droughtClass !== 'severe') {
    reasons.push(`klasa suszy: ${DROUGHT_LABEL[input.droughtClass]}`);
  }
  if (depletionMm !== null && rawMm !== null && depletionMm <= rawMm) {
    const sign = depletionMm < rawMm ? '<' : '=';
    reasons.push(`deficyt glebowy ${fmt(depletionMm)} mm ${sign} próg ${fmt(rawMm)} mm`);
  }
  const stage = getStageForDate(input.crop, analysisDate);
  if (stage?.isCritical !== true) {
    reasons.push(
      `faza rozwojowa na ${analysisDate} (${stage ? stage.name : 'poza sezonem wegetacji'}) nie jest krytyczna`,
    );
  }
  const month = Number(analysisDate.slice(5, 7));
  if (month < IRRIGATION_FIRST_MONTH || month > IRRIGATION_LAST_MONTH) {
    reasons.push(`miesiąc ${month} jest poza okresem nawadniania IV–IX`);
  }
  return reasons;
}

function irrigationEvidence(input: RecommendationsInput): Evidence[] {
  const { depletionMm, rawMm, analysisDate } = input;
  const evidence: Evidence[] = [droughtEvidence(input)];
  if (depletionMm !== null) {
    evidence.push({
      label: 'Deficyt wody w glebie (Dr)',
      value: round(depletionMm),
      unit: 'mm',
      sourceId: 'engine',
      dataDate: analysisDate,
    });
  }
  if (rawMm !== null) {
    evidence.push({
      label: 'Łatwo dostępna woda (RAW)',
      value: round(rawMm),
      unit: 'mm',
      sourceId: 'engine',
      dataDate: analysisDate,
    });
  }
  return evidence;
}

function irrigationRule(input: RecommendationsInput): Draft {
  const { depletionMm, rawMm, etc7DayMeanMm } = input;
  const base = {
    ruleId: 'R-IRR-01',
    category: 'irrigation' as const,
    where: 'cała działka',
    location: input.centroid,
    evidence: irrigationEvidence(input),
  };

  if (depletionMm === null || rawMm === null) {
    return {
      ...base,
      priority: 'low',
      title: 'Nawadnianie: brak danych do oceny zasadności',
      action: `Nie wyliczono dawki, bo brakuje danych o glebie lub bilansie wodnym. ${WATER_PERMIT_NOTE}`,
      when: null,
      why: `Brak danych o glebie lub pogodzie (TAW, RAW, deficyt wody), więc nie można ocenić deficytu glebowego (klasa suszy: ${DROUGHT_LABEL[input.droughtClass]}, stan na ${input.analysisDate}).`,
      irrigation: {
        isJustified: false,
        netDoseMm: null,
        grossDoseMm: null,
        doseM3PerHa: null,
        window: null,
        nextCheckInDays: null,
      },
    };
  }

  const blockers = irrigationBlockers(input);
  if (blockers.length > 0) {
    return {
      ...base,
      priority: 'low',
      title: 'Nawadnianie: obecnie niezasadne',
      action: `Nie nawadniaj teraz. Wróć do oceny przy kolejnej analizie. ${WATER_PERMIT_NOTE}`,
      when: null,
      why: `Nawadnianie jest niezasadne: ${blockers.join('; ')}.`,
      irrigation: {
        isJustified: false,
        netDoseMm: null,
        grossDoseMm: null,
        doseM3PerHa: null,
        window: null,
        nextCheckInDays: null,
      },
    };
  }

  const deficit = Math.min(depletionMm, rawMm);
  const netDose = Math.min(deficit, MAX_NET_DOSE_PER_APPLICATION_MM);
  const grossDose = round(netDose / IRRIGATION_EFFICIENCY);
  const doseM3PerHa = Math.round(grossDose * M3_PER_HA_PER_MM);
  const applications = Math.ceil(deficit / MAX_NET_DOSE_PER_APPLICATION_MM);
  const intervalDays =
    etc7DayMeanMm !== null && etc7DayMeanMm > 0
      ? Math.round(MAX_NET_DOSE_PER_APPLICATION_MM / etc7DayMeanMm)
      : null;
  const nextCheckInDays = intervalDays;
  const applicationsText =
    applications > 1
      ? ` Deficyt do uzupełnienia (mniejsza z wartości Dr i RAW) to ${fmt(deficit)} mm, czyli ${applications} zabiegi po maks. ${MAX_NET_DOSE_PER_APPLICATION_MM} mm netto${intervalDays !== null ? `, co ok. ${intervalDays} dni (przy średnim ETc ${fmt(etc7DayMeanMm ?? 0)} mm/dobę)` : ''}.`
      : ` Deficyt do uzupełnienia (mniejsza z wartości Dr i RAW) to ${fmt(deficit)} mm, wystarczy 1 zabieg.`;
  const applicationsAction =
    applications > 1
      ? ` Powtórz zabieg ${applications} razy${intervalDays !== null ? `, co ok. ${intervalDays} dni` : ''}.`
      : '';
  return {
    ...base,
    priority: input.droughtClass === 'severe' ? 'high' : 'medium',
    title: 'Nawadnianie uzupełniające: zasadne',
    action: `Podaj ok. ${fmt(netDose)} mm netto na zabieg (${fmt(grossDose)} mm brutto, ${fmt(doseM3PerHa, 0)} m³/ha) deszczownią.${applicationsAction} ${WATER_PERMIT_NOTE}`,
    when: IRRIGATION_WINDOW,
    why: `Deficyt wody w glebie (${fmt(depletionMm)} mm) przekracza próg ${fmt(rawMm)} mm, uprawa jest w fazie krytycznej, a klasa suszy to ${DROUGHT_LABEL[input.droughtClass]}. Dawka netto na zabieg nie przekracza ${MAX_NET_DOSE_PER_APPLICATION_MM} mm, brutto uwzględnia sprawność ${IRRIGATION_EFFICIENCY * 100}%.${applicationsText}`,
    irrigation: {
      isJustified: true,
      netDoseMm: round(netDose),
      grossDoseMm: grossDose,
      doseM3PerHa,
      window: IRRIGATION_WINDOW,
      nextCheckInDays,
    },
  };
}

// Fixed order: category (landscape, soil, agrotechnics, irrigation), then rule number.
export function computeRecommendations(input: RecommendationsInput): Recommendation[] {
  if (input.droughtClass === 'unknown' && input.vulnerability.vulnerabilityClass === 'unknown') {
    return [];
  }
  const drafts: (Draft | null)[] = [
    ditchRule(input),
    bufferRule(input),
    pondRule(input),
    organicMatterRule(input),
    coverCropRule(input),
    residueRule(input),
    reducedTillageRule(input),
    acrossSlopeRule(input),
    monitoringRule(input),
    irrigationRule(input),
  ];
  return drafts
    .filter((draft): draft is Draft => draft !== null)
    .map((draft, index) => ({ ...draft, order: index + 1 }));
}
