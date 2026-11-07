import type { ProcessInput } from '../types'

// Training inputs only. These are not a computed schedule or result fixture.
export function createMissionExample(): ProcessInput[] {
  return [
    { id: 1, arrival: '0', burst: '5', priority: '2', queue: '1' },
    { id: 2, arrival: '1', burst: '3', priority: '1', queue: '1' },
    { id: 3, arrival: '2', burst: '6', priority: '3', queue: '1' },
    { id: 4, arrival: '4', burst: '2', priority: '2', queue: '1' },
    { id: 5, arrival: '6', burst: '4', priority: '1', queue: '1' },
  ]
}
