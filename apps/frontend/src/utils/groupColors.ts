// UI-S-007 Colours for parcels in a group: the same colour and number on the map and in the list (T-103)
// Distinct hues, none of them the drought red / green, all readable with white text
const GROUP_COLORS = [
  '#1E63B5', // blue
  '#8E24AA', // purple
  '#00838F', // teal
  '#D35400', // orange
  '#C2185B', // pink
  '#5D4037', // brown
  '#3949AB', // indigo
  '#558B2F', // olive
] as const;

export function groupColor(index: number): string {
  return GROUP_COLORS[index % GROUP_COLORS.length] ?? GROUP_COLORS[0];
}
