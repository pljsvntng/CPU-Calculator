import type { SchedulingConfig } from '../types/scheduling'

/** Policies from lecture pages 24–28. Interqueue behavior is an explicit assumption. */
export const MLQ_LECTURE_PRESET = {
  algorithm: 'MLQ', priorityDirection: 'lower-first', interqueuePreemption: true,
  queues: [
    { level: 1, priority: 0, policy: { algorithm: 'NPP' } },
    { level: 2, priority: 1, policy: { algorithm: 'SRTF' } },
  ],
} as const satisfies SchedulingConfig

export const MLQ_LECTURE_SECOND_PRESET = {
  algorithm: 'MLQ', priorityDirection: 'lower-first', interqueuePreemption: false,
  queues: [
    { level: 1, priority: 0, policy: { algorithm: 'PP' } },
    { level: 2, priority: 1, policy: { algorithm: 'SJF' } },
  ],
} as const satisfies SchedulingConfig

export const MLFQ_PRESET_2_3 = {
  algorithm: 'MLFQ', interqueuePreemption: true,
  levels: [
    { level: 1, policy: { algorithm: 'RR', quantum: 2 } },
    { level: 2, policy: { algorithm: 'RR', quantum: 3 } },
    { level: 3, policy: { algorithm: 'SJF' } },
  ],
} as const satisfies SchedulingConfig

export const MLFQ_PRESET_1_2 = {
  algorithm: 'MLFQ', interqueuePreemption: true,
  levels: [
    { level: 1, policy: { algorithm: 'RR', quantum: 1 } },
    { level: 2, policy: { algorithm: 'RR', quantum: 2 } },
    { level: 3, policy: { algorithm: 'SJF' } },
  ],
} as const satisfies SchedulingConfig
