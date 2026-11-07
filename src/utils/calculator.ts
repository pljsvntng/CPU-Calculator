import type { CalculatorDraft, ProcessInput, QueueDraft } from '../types'
import type { SchedulingConfig, SchedulingProcess, QueuePolicy } from '../types/scheduling'
import { validateSchedulingInput } from './schedulingValidation'
import { integerError } from './validation'

export type FormErrors = Record<string, string>
export interface SchedulingRequest { processes: SchedulingProcess[]; config: SchedulingConfig }
export const MAX_CREW = 20
export const MAX_QUEUES = 8
export const blankProcess = (id: number): ProcessInput => ({ id, arrival: '', burst: '', priority: '', queue: '1' })
export function createCalculatorDraft(): CalculatorDraft {
  return {
    algorithm: 'FCFS', quantum: '2', processes: [blankProcess(1)], nextProcessId: 2, priorityDirection: 'lower-first',
    mlqQueues: [
      { level: 1, policy: 'NPP', priority: '0', quantum: '2' },
      { level: 2, policy: 'SRTF', priority: '1', quantum: '2' },
    ],
    mlfqLevels: [
      { level: 1, policy: 'RR', priority: '0', quantum: '2' },
      { level: 2, policy: 'RR', priority: '1', quantum: '3' },
      { level: 3, policy: 'SJF', priority: '2', quantum: '2' },
    ],
    mlqPreemption: true, mlfqPreemption: true, agingEnabled: false, agingInterval: '10',
    boostEnabled: false, boostInterval: '20', source: null,
  }
}
export function needsProcessPriority(draft: CalculatorDraft, process?: ProcessInput) {
  if (draft.algorithm === 'NPP' || draft.algorithm === 'PP') return true
  if (draft.algorithm !== 'MLQ') return false
  return draft.mlqQueues.some(queue => (!process || String(queue.level) === process.queue) && (queue.policy === 'NPP' || queue.policy === 'PP'))
}
export function resizeQueues(queues: QueueDraft[], count: number, feedback: boolean): QueueDraft[] {
  return Array.from({ length: count }, (_, index) => queues[index] ?? {
    level: index + 1, policy: feedback && index === count - 1 ? 'SJF' : 'RR', priority: String(index), quantum: '2',
  })
}

export function prepareRequest(draft: CalculatorDraft): { request: SchedulingRequest | null; errors: FormErrors } {
  const errors: FormErrors = {}
  const number = (value: string, minimum: number, key: string, label: string) => {
    if (value.trim() === '') errors[key] = `${label} is required.`
    else if (integerError(value, minimum)) errors[key] = `${label} must be ${minimum === 0 ? 'a non-negative' : 'a positive'} safe integer.`
    return Number(value)
  }
  const policy = (queue: QueueDraft, key: string): QueuePolicy => queue.policy === 'RR'
    ? { algorithm: 'RR', quantum: number(queue.quantum, 1, `${key}.quantum`, 'Time quantum') }
    : { algorithm: queue.policy }
  let config: SchedulingConfig
  switch (draft.algorithm) {
    case 'FCFS': case 'SJF': case 'SRTF': config = { algorithm: draft.algorithm }; break
    case 'NPP': case 'PP': config = { algorithm: draft.algorithm, priorityDirection: draft.priorityDirection }; break
    case 'RR': config = { algorithm: 'RR', quantum: number(draft.quantum, 1, 'quantum', 'Time quantum') }; break
    case 'MLQ': config = {
      algorithm: 'MLQ', priorityDirection: draft.priorityDirection, interqueuePreemption: draft.mlqPreemption,
      queues: draft.mlqQueues.map(queue => ({ level: queue.level,
        priority: number(queue.priority, 0, `mlq.${queue.level}.priority`, 'Queue priority'), policy: policy(queue, `mlq.${queue.level}`),
      })),
    }; break
    case 'MLFQ': {
      const levels = draft.mlfqLevels.map((queue, index) => {
        if (index < draft.mlfqLevels.length - 1 && queue.policy !== 'RR') errors[`mlfq.${queue.level}.policy`] = 'Intermediate feedback levels must use Round Robin.'
        if (!['RR', 'SJF', 'FCFS'].includes(queue.policy)) errors[`mlfq.${queue.level}.policy`] = 'The feedback engine supports RR, SJF, or FCFS only.'
        return { level: queue.level, policy: policy(queue, `mlfq.${queue.level}`) }
      })
      config = { algorithm: 'MLFQ', interqueuePreemption: draft.mlfqPreemption,
        levels: levels as Extract<SchedulingConfig, { algorithm: 'MLFQ' }>['levels'],
        ...(draft.agingEnabled ? { agingInterval: number(draft.agingInterval, 1, 'agingInterval', 'Aging interval') } : {}),
        ...(draft.boostEnabled ? { boostInterval: number(draft.boostInterval, 1, 'boostInterval', 'Boost interval') } : {}),
      }
      break
    }
    default: return { request: null, errors: { configuration: 'Unsupported scheduling algorithm.' } }
  }
  if (!draft.processes.length) errors.processes = 'Add at least one process before starting a simulation.'
  if (draft.processes.length > MAX_CREW) errors.processes = `This input workspace supports up to ${MAX_CREW} processes.`
  const seen = new Set<number>()
  const processes = draft.processes.map((process, index): SchedulingProcess => {
    const key = `process.${process.id}`
    if (!Number.isSafeInteger(process.id) || process.id < 1 || seen.has(process.id)) errors[`${key}.id`] = 'Process IDs must be positive, unique integers.'
    seen.add(process.id)
    const arrivalTime = number(process.arrival, 0, `${key}.arrival`, 'Arrival time')
    const burstTime = number(process.burst, 1, `${key}.burst`, 'Burst time')
    const priority = needsProcessPriority(draft, process) ? number(process.priority, 0, `${key}.priority`, 'Priority') : undefined
    const queues = draft.algorithm === 'MLQ' ? draft.mlqQueues : draft.mlfqLevels
    let queueLevel: number | undefined
    if (draft.algorithm === 'MLQ' || draft.algorithm === 'MLFQ') {
      queueLevel = number(process.queue, 1, `${key}.queue`, 'Queue assignment')
      if (!queues.some(queue => queue.level === queueLevel)) errors[`${key}.queue`] = 'Choose an existing configured queue.'
    }
    return { id: `P${process.id}`, arrivalTime, burstTime, originalInputOrder: index,
      ...(priority === undefined ? {} : { priority }), ...(queueLevel === undefined ? {} : { queueLevel }),
    }
  })
  if (!Object.keys(errors).length) {
    try { validateSchedulingInput(processes, config) }
    catch (error) { errors.configuration = error instanceof Error ? error.message : 'Invalid scheduler configuration.' }
  }
  return { request: Object.keys(errors).length ? null : { processes, config }, errors }
}

export function draftFromRequest(request: SchedulingRequest, previous = createCalculatorDraft()): CalculatorDraft {
  return { ...applyConfiguration(previous, request.config),
    processes: request.processes.map(process => ({
      id: Number(process.id.replace(/^P/, '')), arrival: String(process.arrivalTime), burst: String(process.burstTime),
      priority: process.priority === undefined ? '' : String(process.priority), queue: String(process.queueLevel ?? 1),
    })),
    nextProcessId: Math.max(...request.processes.map(p => Number(p.id.replace(/^P/, '')))) + 1,
  }
}
export function applyConfiguration(previous: CalculatorDraft, config: SchedulingConfig): CalculatorDraft {
  const draft: CalculatorDraft = { ...previous, algorithm: config.algorithm }
  if (config.algorithm === 'RR') draft.quantum = String(config.quantum)
  if (config.algorithm === 'NPP' || config.algorithm === 'PP' || config.algorithm === 'MLQ') draft.priorityDirection = config.priorityDirection ?? 'lower-first'
  const queueDraft = (level: number, value: QueuePolicy, priority = level - 1): QueueDraft => ({
    level, policy: value.algorithm, priority: String(priority), quantum: value.algorithm === 'RR' ? String(value.quantum) : '2',
  })
  if (config.algorithm === 'MLQ') {
    draft.mlqQueues = config.queues.map(queue => queueDraft(queue.level, queue.policy, queue.priority))
    draft.mlqPreemption = config.interqueuePreemption ?? true
  }
  if (config.algorithm === 'MLFQ') {
    draft.mlfqLevels = config.levels.map(level => queueDraft(level.level, level.policy))
    draft.mlfqPreemption = config.interqueuePreemption ?? true
    draft.agingEnabled = config.agingInterval !== undefined
    draft.agingInterval = String(config.agingInterval ?? 10)
    draft.boostEnabled = config.boostInterval !== undefined
    draft.boostInterval = String(config.boostInterval ?? 20)
  }
  return draft
}
