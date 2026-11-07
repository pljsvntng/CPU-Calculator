export type AlgorithmId = 'FCFS' | 'SJF' | 'NPP' | 'SRTF' | 'PP' | 'RR' | 'MLQ' | 'MLFQ'
export type AlgorithmGroup = 'non-preemptive' | 'preemptive'

export interface Algorithm {
  id: AlgorithmId
  name: string
  group: AlgorithmGroup
  summary: string
  description: string
  principle: string
  consideration: string
  pages: string
  needsPriority?: boolean
  needsQuantum?: boolean
}

// Raw text preserves incomplete form input without inventing calculated data.
export interface ProcessInput {
  id: number
  arrival: string
  burst: string
  priority: string
  queue: string
}

export interface QueueDraft {
  level: number
  policy: import('./scheduling').QueueAlgorithm
  priority: string
  quantum: string
}
export interface CalculatorDraft {
  algorithm: AlgorithmId
  quantum: string
  processes: ProcessInput[]
  nextProcessId: number
  priorityDirection: import('./scheduling').PriorityDirection
  mlqQueues: QueueDraft[]
  mlfqLevels: QueueDraft[]
  mlqPreemption: boolean
  mlfqPreemption: boolean
  agingEnabled: boolean
  agingInterval: string
  boostEnabled: boolean
  boostInterval: string
  source: { label: string; note: string } | null
}
