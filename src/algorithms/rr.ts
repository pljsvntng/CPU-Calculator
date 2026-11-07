import type { SchedulingPolicy } from '../engine/policy'

export function rrPolicy(quantum: number): SchedulingPolicy {
  // Queue insertion order, rather than arrival-time sorting, determines each turn.
  return { algorithm: 'RR', quantum, compare: () => 0, shouldPreempt: () => false }
}
