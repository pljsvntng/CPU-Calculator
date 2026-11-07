import { byArrival } from '../engine/policy'
import type { SchedulingPolicy } from '../engine/policy'

export function srtfPolicy(): SchedulingPolicy {
  return {
    algorithm: 'SRTF',
    compare: (a, b) => a.remainingTime - b.remainingTime || byArrival(a, b),
    shouldPreempt: (candidate, running) => candidate.remainingTime < running.remainingTime,
  }
}
