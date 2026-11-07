import type { SchedulingConfig } from '../types/scheduling'
import type { SimulationPlan } from '../engine/policy'
import { createQueuePolicy } from './queuePolicy'

export function mlqPlan(config: Extract<SchedulingConfig, { algorithm: 'MLQ' }>): SimulationPlan {
  return {
    feedback: null,
    interqueuePreemption: config.interqueuePreemption ?? true,
    queues: config.queues.map(queue => ({ ...queue, policy: createQueuePolicy(queue.policy, config.priorityDirection), ready: [] }))
      .sort((a, b) => a.priority - b.priority || a.level - b.level),
  }
}
