import type { SchedulingConfig } from '../types/scheduling'
import type { SimulationPlan } from '../engine/policy'
import { orderedReady } from '../engine/policy'
import { createQueuePolicy } from './queuePolicy'

export function mlfqPlan(config: Extract<SchedulingConfig, { algorithm: 'MLFQ' }>): SimulationPlan {
  return {
    feedback: {
      topLevel: 1,
      // Configured quantum, CPU-service, or dispatch exhaustion can demote.
      // The final level always retains membership.
      demotionTarget: currentLevel => Math.min(currentLevel + 1, config.levels.length),
      // Aging rewards uninterrupted READY waiting, never CPU execution time.
      agingTarget: currentLevel => Math.max(1, currentLevel - 1),
      // Deterministic boosts preserve queued work ahead of the running turn.
      boostOrder: (queues, running) => [...queues.flatMap(orderedReady), ...(running ? [running] : [])],
    },
    interqueuePreemption: config.interqueuePreemption ?? true,
    queues: config.levels.map(level => {
      const policy = createQueuePolicy(level.policy, config.priorityDirection)
      if (policy.algorithm === 'FCFS') policy.compare = (a, b) => a.queueEntryTime - b.queueEntryTime || a.input.originalInputOrder - b.input.originalInputOrder
      return { ...level, priority: level.level, demotion: level.demotion ?? { kind: level.policy.algorithm === 'RR' ? 'quantum' as const : 'none' as const }, policy, ready: [] }
    })
      .sort((a, b) => a.level - b.level),
  }
}
