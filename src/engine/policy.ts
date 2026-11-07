import type { QueueAlgorithm } from '../types/scheduling'
import type { SchedulingProcess } from '../types/scheduling'

export interface RuntimeProcess {
  input: SchedulingProcess
  remainingTime: number
  firstStartTime: number | null
  completionTime: number | null
  executedTime: number
  currentQueueLevel: number
  arrived: boolean
  readySince: number
  budgetRemaining: number | null
  executionHistory: InternalSegment[]
}
export interface InternalSegment {
  processId: string | null
  startTime: number
  endTime: number
  duration: number
  isIdle: boolean
  queueLevel?: number
  dispatch: number
}
export interface SchedulingPolicy {
  algorithm: QueueAlgorithm
  quantum?: number
  compare: (a: RuntimeProcess, b: RuntimeProcess) => number
  shouldPreempt: (candidate: RuntimeProcess, running: RuntimeProcess) => boolean
}
export interface RuntimeQueue {
  level: number
  priority: number
  policy: SchedulingPolicy
  ready: RuntimeProcess[]
}
export interface SimulationPlan {
  queues: RuntimeQueue[]
  interqueuePreemption: boolean
  feedback: FeedbackRules | null
}
export interface FeedbackRules {
  topLevel: number
  demotionTarget: (currentLevel: number) => number
  agingTarget: (currentLevel: number) => number
  boostOrder: (queues: RuntimeQueue[], running: RuntimeProcess | null) => RuntimeProcess[]
}
export function byArrival(a: RuntimeProcess, b: RuntimeProcess) {
  return a.input.arrivalTime - b.input.arrivalTime || a.input.originalInputOrder - b.input.originalInputOrder
}
export function orderedReady(queue: RuntimeQueue) {
  // RR is a real FIFO queue, including retained turns at the front after interruption.
  return queue.policy.algorithm === 'RR' ? [...queue.ready] : [...queue.ready].sort(queue.policy.compare)
}
