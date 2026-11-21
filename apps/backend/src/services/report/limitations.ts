// T-018 DM-001 limitations[]: fixed limitations (ADR-007 section 11, ADR-009 source split) + dedup merge
export const BASE_LIMITATIONS: string[] = [
  'SoilGrids ma rozdzielczość 250 m: to model, nie pomiar na działce, więc skład gleby może się różnić.',
  'ERA5 i ERA5-Land mają siatkę ok. 9–25 km, więc opad lokalny (np. burza) może różnić się od podanego.',
  'NASA POWER ma siatkę ok. 50 km i służy tylko do oceny tła z 10 lat.',
  'Rozkład odniesienia obejmuje 10 lat, to krótki szereg wieloletni.',
  'ASCAT (EUMETSAT) ma 12,5–25 km i obejmuje tylko warstwę powierzchniową; źródło jest opcjonalne.',
  'Model terenu (DEM) ma rozdzielczość 90 m, więc spadek terenu jest przybliżony.',
  'Sentinel-2 ma rozdzielczość 10–20 m, a chmury mogą wykluczyć świeże zdjęcia.',
  'Kompletność rowów i cieków w OpenStreetMap zależy od wolontariuszy i może być niepełna.',
  'Nie uwzględniono prognozy pogody.',
  'Nie uwzględniono zabiegów agrotechnicznych ani nawadniania na działce.',
  'Stan bieżący (wartości w mm i %) pochodzi z ERA5/ERA5-Land (ok. 9 km), a ocena na tle 10 lat (percentyl, anomalia, klasa) z NASA POWER (ok. 50 km); źródeł nie mieszamy w jednym porównaniu.',
];

export function buildLimitations(extra: string[]): string[] {
  return [...new Set([...BASE_LIMITATIONS, ...extra])];
}
