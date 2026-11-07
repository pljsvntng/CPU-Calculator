import { describe, expect, it } from 'vitest'
import { integerError } from '../utils/validation'

describe('process input validation', () => {
  it.each(['', ' ', '-1', '0.5', 'NaN', 'Infinity', '9007199254740992'])('rejects invalid arrival time %j', value => {
    expect(integerError(value, 0)).toBeDefined()
  })
  it.each(['0', '1', '120'])('accepts a nonnegative whole arrival time %s', value => {
    expect(integerError(value, 0)).toBeUndefined()
  })
  it('requires positive burst times and quantum values', () => {
    expect(integerError('0', 1)).toBeDefined()
    expect(integerError('1', 1)).toBeUndefined()
  })
})
