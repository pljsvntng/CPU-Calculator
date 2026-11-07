import type { AlgorithmId } from './index'

export interface SchedulingProcess {
  readonly id: string
  readonly arrivalTime: number
  readonly burstTime: number
  readonly priority?: number
  readonly queueLevel?: number
  readonly originalInputOrder: number
}

export type PriorityDirection = 'lower-first' | 'higher-first'
export type QueueAlgorithm = Exclude<AlgorithmId, 'MLQ' | 'MLFQ'>
export type QueuePolicy = { algorithm: Exclude<QueueAlgorithm, 'RR'> } | { algorithm: 'RR'; quantum: number }
export interface FixedQueue { level: number; priority: number; policy: QueuePolicy }
export interface FeedbackLevel { level: number; policy: { algorithm: 'RR'; quantum: number } | { algorithm: 'SJF' | 'FCFS' } }
export interface PriorityPromotion { time: number; processId: string; targetQueueLevel: number }
export interface SimulationLimits {
  maxTransitions?: number
  maxSegments?: number
  maxEvents?: number
  maxSnapshotEntries?: number
}
export interface BaseSchedulingOptions { limits?: SimulationLimits }
export type SchedulingConfig =
  | (BaseSchedulingOptions & { algorithm: 'FCFS' | 'SJF' | 'SRTF' })
  | (BaseSchedulingOptions & { algorithm: 'NPP' | 'PP'; priorityDirection?: PriorityDirection })
  | (BaseSchedulingOptions & { algorithm: 'RR'; quantum: number })
  | (BaseSchedulingOptions & { algorithm: 'MLQ'; queues: readonly FixedQueue[]; interqueuePreemption?: boolean; priorityDirection?: PriorityDirection })
  | (BaseSchedulingOptions & {
    algorithm: 'MLFQ'
    levels: readonly FeedbackLevel[]
    interqueuePreemption?: boolean
    agingInterval?: number
    boostInterval?: number
    priorityPromotions?: readonly PriorityPromotion[]
  })

export interface GanttSegment {
  processId: string | null
  startTime: number
  endTime: number
  duration: number
  isIdle: boolean
  queueLevel?: number
}
export interface ScheduledProcess extends SchedulingProcess {
  remainingTime: number
  firstStartTime: number
  completionTime: number
  executedTime: number
  currentQueueLevel: number
  executionHistory: GanttSegment[]
  turnaroundTime: number
  waitingTime: number
  responseTime: number
}
export type SchedulingEventType =
  | 'process-arrived' | 'process-selected' | 'process-started' | 'process-preempted'
  | 'quantum-expired' | 'process-requeued' | 'process-demoted' | 'process-promoted'
  | 'process-completed' | 'cpu-idle' | 'priority-boost' | 'promotion-skipped'
export interface ReadyQueueSnapshot { queueLevel: number; processIds: string[] }
export interface SchedulingEvent {
  sequence: number
  timestamp: number
  type: SchedulingEventType
  processId?: string
  runningProcessId: string | null
  readyQueues: ReadyQueueSnapshot[]
  remainingBurstTimes: { processId: string; remainingTime: number }[]
  explanation: string
}
export interface SchedulingMetrics {
  averageTurnaroundTime: number
  averageWaitingTime: number
  averageResponseTime: number
  totalBusyTime: number
  totalIdleTime: number
  observationStartTime: 0
  observationEndTime: number
  totalObservedTime: number
  cpuUtilization: number
  throughput: number
  completedProcesses: number
}
export interface SchedulingResult {
  algorithm: AlgorithmId
  config: SchedulingConfig
  processes: ScheduledProcess[]
  segments: GanttSegment[]
  events: SchedulingEvent[]
  metrics: SchedulingMetrics
}
