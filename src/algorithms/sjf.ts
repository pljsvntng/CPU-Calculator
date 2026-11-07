import { byArrival } from '../engine/policy'
import type { SchedulingPolicy } from '../engine/policy'

export function sjfPolicy(): SchedulingPolicy {
  return {
    algorithm: 'SJF',
    compare: (a, b) => a.remainingTime - b.remainingTime || byArrival(a, b),
    shouldPreempt: () => false,
  }
}
