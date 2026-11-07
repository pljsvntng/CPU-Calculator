import type { SchedulingConfig, SchedulingProcess } from '../types/scheduling'
import { SchedulingValidationError } from '../engine/errors'
import { DEFAULT_LIMITS } from '../engine/limits'

function fail(message: string): never { throw new SchedulingValidationError(message) }
function record(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object.`)
}
function integer(value: unknown, minimum: number, name: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) fail(`${name} must be a finite safe integer >= ${minimum}.`)
}
function keys(value: Record<string, unknown>, allowed: string[], name: string) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`Unsupported ${name} option: ${key}.`)
}
function policy(value: unknown, name: string, feedback: boolean, last: boolean) {
  record(value, name)
  const allowed = feedback ? (last ? ['RR', 'SJF', 'FCFS'] : ['RR']) : ['FCFS', 'SJF', 'NPP', 'SRTF', 'PP', 'RR']
  if (typeof value.algorithm !== 'string' || !allowed.includes(value.algorithm)) fail(`${name} has an unsupported algorithm.`)
  keys(value, value.algorithm === 'RR' ? ['algorithm', 'quantum'] : ['algorithm'], name)
  if (value.algorithm === 'RR') integer(value.quantum, 1, `${name} quantum`)
}

/** Validate the runtime API boundary, including JSON/JavaScript callers. No coercion. */
export function validateSchedulingInput(processes: unknown, config: unknown): asserts processes is readonly SchedulingProcess[] {
  if (!Array.isArray(processes) || processes.length === 0) fail('A nonempty process dataset is required.')
  if (processes.length > 10_000) fail('At most 10,000 processes are supported per simulation.')
  record(config, 'Scheduling configuration')
  const allowed: Record<string, string[]> = {
    FCFS: [], SJF: [], SRTF: [], RR: ['quantum'], NPP: ['priorityDirection'], PP: ['priorityDirection'],
    MLQ: ['queues', 'interqueuePreemption', 'priorityDirection'],
    MLFQ: ['levels', 'interqueuePreemption', 'agingInterval', 'boostInterval', 'priorityPromotions'],
  }
  const algorithm = config.algorithm
  if (typeof algorithm !== 'string' || !Object.hasOwn(allowed, algorithm)) fail('Unsupported scheduling algorithm.')
  keys(config, ['algorithm', 'limits', ...allowed[algorithm]], 'configuration')
  if (config.priorityDirection !== undefined && (typeof config.priorityDirection !== 'string' || !['lower-first', 'higher-first'].includes(config.priorityDirection))) fail('priorityDirection must be lower-first or higher-first.')
  if (config.interqueuePreemption !== undefined && typeof config.interqueuePreemption !== 'boolean') fail('interqueuePreemption must be a boolean.')
  if (config.limits !== undefined) {
    record(config.limits, 'limits')
    keys(config.limits, Object.keys(DEFAULT_LIMITS), 'limit')
    for (const [key, value] of Object.entries(config.limits)) integer(value, 1, `limits.${key}`)
  }
  if (algorithm === 'RR') integer(config.quantum, 1, 'Round Robin quantum')
  const queueLevels = new Set<number>([1])
  const priorityLevels = new Set<number>()
  if (algorithm === 'MLQ' || algorithm === 'MLFQ') {
    const definitions = algorithm === 'MLQ' ? config.queues : config.levels
    if (!Array.isArray(definitions) || definitions.length < (algorithm === 'MLFQ' ? 2 : 1)) fail(`${algorithm} requires ${algorithm === 'MLFQ' ? 'at least two levels' : 'at least one queue'}.`)
    if (definitions.length > 1_000) fail('At most 1,000 queue levels are supported.')
    queueLevels.clear()
    for (const [index, definition] of definitions.entries()) {
      record(definition, `Queue ${index + 1}`)
      keys(definition, algorithm === 'MLQ' ? ['level', 'priority', 'policy'] : ['level', 'policy'], 'queue')
      integer(definition.level, 1, 'Queue level')
      if (queueLevels.has(definition.level)) fail('Queue levels must be unique.')
      queueLevels.add(definition.level)
      if (algorithm === 'MLQ') integer(definition.priority, 0, 'Queue priority')
      policy(definition.policy, `Queue ${definition.level} policy`, algorithm === 'MLFQ', definition.level === definitions.length)
      if (['NPP', 'PP'].includes((definition.policy as { algorithm: string }).algorithm)) priorityLevels.add(definition.level)
    }
    for (let level = 1; level <= definitions.length; level++) if (!queueLevels.has(level)) fail('Queue levels must be contiguous, starting at 1.')
  }
  if (algorithm === 'MLFQ') {
    for (const option of ['agingInterval', 'boostInterval']) if (config[option] !== undefined) integer(config[option], 1, option)
  }
  const ids = new Set<string>()
  const orders = new Set<number>()
  let burstSum = 0
  let maxArrival = 0
  for (const [index, process] of processes.entries()) {
    record(process, `Process ${index + 1}`)
    if (typeof process.id !== 'string' || !process.id.trim()) fail(`Process ${index + 1} requires a nonblank string ID.`)
    if (ids.has(process.id)) fail(`Duplicate process ID: ${process.id}.`)
    ids.add(process.id)
    integer(process.arrivalTime, 0, `${process.id} arrivalTime`)
    integer(process.burstTime, 1, `${process.id} burstTime`)
    integer(process.originalInputOrder, 0, `${process.id} originalInputOrder`)
    if (orders.has(process.originalInputOrder)) fail('originalInputOrder values must be unique.')
    orders.add(process.originalInputOrder)
    if (process.priority !== undefined) integer(process.priority, 0, `${process.id} priority`)
    if (process.queueLevel !== undefined) {
      integer(process.queueLevel, 1, `${process.id} queueLevel`)
      if (!queueLevels.has(process.queueLevel)) fail(`${process.id} has an invalid queue assignment.`)
    }
    if (algorithm === 'MLQ' && process.queueLevel === undefined) fail(`${process.id} requires a fixed queueLevel for MLQ.`)
    if (algorithm === 'NPP' || algorithm === 'PP' || priorityLevels.has(process.queueLevel as number)) integer(process.priority, 0, `${process.id} priority`)
    burstSum += process.burstTime
    maxArrival = Math.max(maxArrival, process.arrivalTime)
  }
  // Guarantee exact integer timestamps AND exact integer metric numerators.
  if (!Number.isSafeInteger((burstSum + maxArrival) * processes.length)) fail('Dataset exceeds the exact safe-integer time/metric range.')
  if (algorithm === 'MLFQ' && config.priorityPromotions !== undefined) {
    if (!Array.isArray(config.priorityPromotions)) fail('priorityPromotions must be an array.')
    for (const promotion of config.priorityPromotions) {
      record(promotion, 'Priority promotion')
      keys(promotion, ['time', 'processId', 'targetQueueLevel'], 'promotion')
      integer(promotion.time, 0, 'Promotion time')
      integer(promotion.targetQueueLevel, 1, 'Promotion targetQueueLevel')
      if (!ids.has(promotion.processId as string) || !queueLevels.has(promotion.targetQueueLevel)) fail('Promotion requires a known process ID and queue level.')
      const process = processes.find(item => item.id === promotion.processId)!
      if (promotion.time < process.arrivalTime) fail('Promotion time cannot precede process arrival.')
    }
  }
}

export function copySchedulingRequest(processes: readonly SchedulingProcess[], config: SchedulingConfig) {
  validateSchedulingInput(processes, config)
  return {
    processes: processes.map(process => ({ ...process })).sort((a, b) => a.originalInputOrder - b.originalInputOrder),
    config: structuredClone(config),
  }
}
