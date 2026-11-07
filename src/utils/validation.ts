export function integerError(value: string, minimum: number): string | undefined {
  if (value.trim() === '') return 'Required'
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < minimum) {
    return minimum === 0 ? 'Use a whole number of 0 or more.' : 'Use a whole number of 1 or more.'
  }
  return undefined
}
