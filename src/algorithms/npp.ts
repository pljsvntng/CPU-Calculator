import { byArrival } from '../engine/policy'
import type { SchedulingPolicy } from '../engine/policy'
import type { PriorityDirection } from '../types/scheduling'

export function nppPolicy(direction: PriorityDirection = 'lower-first'): SchedulingPolicy {
  const sign = direction === 'lower-first' ? 1 : -1
  return {
    algorithm: 'NPP',
    compare: (a, b) => sign * (a.input.priority! - b.input.priority!) || byArrival(a, b),
    shouldPreempt: () => false,
  }
}
