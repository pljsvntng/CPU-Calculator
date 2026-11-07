export function displayNumber(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 })
}
