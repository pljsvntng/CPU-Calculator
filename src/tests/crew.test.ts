import { expect, it } from 'vitest'
import { getCrewColor } from '../data/crew'

it('preserves the specified eight crew colors and extends deterministic identities through P20', () => {
  expect(Array.from({ length: 8 }, (_, index) => getCrewColor(index + 1).name)).toEqual([
    'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Cyan', 'Orange', 'Purple',
  ])
  expect(getCrewColor(9).name).toBe('Teal')
  expect(getCrewColor(20).name).toBe('Sand')
  expect(new Set(Array.from({ length: 20 }, (_, index) => getCrewColor(index + 1).value)).size).toBe(20)
  expect(getCrewColor(21)).toEqual(getCrewColor(1))
})
