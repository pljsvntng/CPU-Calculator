import type { SchedulingConfig, SchedulingProcess } from '../types/scheduling'
import { copySchedulingRequest } from '../utils/schedulingValidation'
import { createQueuePolicy } from '../algorithms/queuePolicy'
import { mlqPlan } from '../algorithms/mlq'
import { mlfqPlan } from '../algorithms/mlfq'
import { simulate } from './simulation'

/** Public, React-independent scheduling entry point. Never mutates caller data. */
export function schedule(processes: readonly SchedulingProcess[], config: SchedulingConfig) {
  const request = copySchedulingRequest(processes, config)
  if (request.config.algorithm === 'MLQ') return simulate(request.processes, request.config, mlqPlan(request.config))
  if (request.config.algorithm === 'MLFQ') return simulate(request.processes, request.config, mlfqPlan(request.config))
  const single = request.config
  const policy = createQueuePolicy(single.algorithm === 'RR' ? { algorithm: 'RR', quantum: single.quantum } : { algorithm: single.algorithm },
    single.algorithm === 'NPP' || single.algorithm === 'PP' ? single.priorityDirection : undefined)
  return simulate(request.processes, single, {
    feedback: null, interqueuePreemption: false,
    queues: [{ level: 1, priority: 0, policy, ready: [] }],
  })
}

export { SchedulingValidationError, SchedulingLimitError } from './errors'
export type * from '../types/scheduling'
