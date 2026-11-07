// A stable visual identity for each process; this does not affect scheduling.
export const crewColors = [
  { name: 'Red', value: '#E53935', shade: '#992420' },
  { name: 'Blue', value: '#2563EB', shade: '#16378B' },
  { name: 'Green', value: '#22C55E', shade: '#116C35' },
  { name: 'Yellow', value: '#FACC15', shade: '#9A7407' },
  { name: 'Pink', value: '#EC4899', shade: '#9D2260' },
  { name: 'Cyan', value: '#06B6D4', shade: '#08758A' },
  { name: 'Orange', value: '#F97316', shade: '#A1420A' },
  { name: 'Purple', value: '#A855F7', shade: '#65319A' },
] as const

// The original eight identities stay intact; additional crew have stable hues.
const extendedCrewColors = [
  { name: 'Teal', value: '#14B8A6', shade: '#0F766E' },
  { name: 'Rose', value: '#FB7185', shade: '#9F1239' },
  { name: 'Indigo', value: '#818CF8', shade: '#4338CA' },
  { name: 'Lime', value: '#A3E635', shade: '#4D7C0F' },
  { name: 'Amber', value: '#FBBF24', shade: '#B45309' },
  { name: 'Sky', value: '#38BDF8', shade: '#0369A1' },
  { name: 'Plum', value: '#C084FC', shade: '#7E22CE' },
  { name: 'Coral', value: '#FB923C', shade: '#C2410C' },
  { name: 'Mint', value: '#6EE7B7', shade: '#047857' },
  { name: 'Lilac', value: '#E879F9', shade: '#A21CAF' },
  { name: 'Slate', value: '#94A3B8', shade: '#475569' },
  { name: 'Sand', value: '#D6B88B', shade: '#8B693E' },
] as const
const fullPalette = [...crewColors, ...extendedCrewColors]

export function getCrewColor(processId: number) {
  return fullPalette[((processId - 1) % fullPalette.length + fullPalette.length) % fullPalette.length]
}
