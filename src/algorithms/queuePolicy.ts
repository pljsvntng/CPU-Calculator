import type { PriorityDirection, QueuePolicy } from '../types/scheduling'
import { fcfsPolicy } from './fcfs'
import { sjfPolicy } from './sjf'
import { nppPolicy } from './npp'
import { srtfPolicy } from './srtf'
import { ppPolicy } from './pp'
import { rrPolicy } from './rr'

export function createQueuePolicy(policy: QueuePolicy, direction: PriorityDirection = 'lower-first') {
  switch (policy.algorithm) {
    case 'FCFS': return fcfsPolicy()
    case 'SJF': return sjfPolicy()
    case 'NPP': return nppPolicy(direction)
    case 'SRTF': return srtfPolicy()
    case 'PP': return ppPolicy(direction)
    case 'RR': return rrPolicy(policy.quantum)
  }
}
