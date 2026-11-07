import type { SchedulingConfig } from '../types/scheduling'
import type { SimulationPlan } from '../engine/policy'
import { orderedReady } from '../engine/policy'
import { createQueuePolicy } from './queuePolicy'

export function mlfqPlan(config: Extract<SchedulingConfig, { algorithm: 'MLFQ' }>): SimulationPlan {
  return {
    feedback: {
      topLevel: 1,
      // Exhausting a level's complete RR allotment demotes one level. The
      // final level retains membership when its own quantum expires.
      demotionTarget: currentLevel => Math.min(currentLevel + 1, config.levels.length),
      // Aging rewards uninterrupted READY waiting, never CPU execution time.
      agingTarget: currentLevel => Math.max(1, currentLevel - 1),
      // Deterministic boosts preserve queued work ahead of the running turn.
      boostOrder: (queues, running) => [...queues.flatMap(orderedReady), ...(running ? [running] : [])],
    },
    interqueuePreemption: config.interqueuePreemption ?? true,
    queues: config.levels.map(level => ({ ...level, priority: level.level, policy: createQueuePolicy(level.policy), ready: [] }))
      .sort((a, b) => a.level - b.level),
  }
}
