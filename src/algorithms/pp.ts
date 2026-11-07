import { nppPolicy } from './npp'
import type { SchedulingPolicy } from '../engine/policy'
import type { PriorityDirection } from '../types/scheduling'

export function ppPolicy(direction: PriorityDirection = 'lower-first'): SchedulingPolicy {
  const sign = direction === 'lower-first' ? 1 : -1
  return {
    algorithm: 'PP', compare: nppPolicy(direction).compare,
    shouldPreempt: (candidate, running) => sign * (candidate.input.priority! - running.input.priority!) < 0,
  }
}
