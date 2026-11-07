import { byArrival } from '../engine/policy'
import type { SchedulingPolicy } from '../engine/policy'

export function fcfsPolicy(): SchedulingPolicy {
  return { algorithm: 'FCFS', compare: byArrival, shouldPreempt: () => false }
}
