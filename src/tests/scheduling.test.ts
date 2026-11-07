import { describe, expect, it } from 'vitest'
import { schedule, SchedulingLimitError, SchedulingValidationError } from '../engine/scheduler'
import type { SchedulingConfig, SchedulingProcess, SchedulingResult } from '../types/scheduling'
import { MLQ_LECTURE_PRESET, MLFQ_PRESET_1_2, MLFQ_PRESET_2_3 } from '../data/schedulingPresets'
import { lectureExamples, workload } from './fixtures/lectureExamples'
import type { ExpectedSlice } from './fixtures/lectureExamples'
import { referenceTimeline } from './helpers/referenceScheduler'

function slices(result: SchedulingResult): ExpectedSlice[] {
  return result.segments.map(segment => [segment.processId, segment.startTime, segment.endTime])
}
function coalesce(input: ExpectedSlice[]) {
  const output: ExpectedSlice[] = []
  for (const slice of input) {
    const previous = output.at(-1)
    if (previous && previous[0] === slice[0] && previous[2] === slice[1]) previous[2] = slice[2]
    else output.push([...slice])
  }
  return output
}
function timeline(result: SchedulingResult) {
  return result.segments.flatMap(segment => Array<string | null>(segment.duration).fill(segment.processId))
}

/** Recompute conservation, timings, averages, and utilization from the timeline. */
function verify(result: SchedulingResult, input: readonly SchedulingProcess[]) {
  const byId = new Map(input.map(process => [process.id, process]))
  expect(result.processes).toHaveLength(input.length)
  expect(result.metrics.completedProcesses).toBe(input.length)
  let previousEnd = 0
  let busy = 0
  let idle = 0
  for (const segment of result.segments) {
    expect(segment.startTime).toBe(previousEnd)
    expect(segment.endTime).toBeGreaterThan(segment.startTime)
    expect(Number.isSafeInteger(segment.endTime)).toBe(true)
    expect(segment.duration).toBe(segment.endTime - segment.startTime)
    if (segment.isIdle) { expect(segment.processId).toBeNull(); idle += segment.duration }
    else {
      expect(byId.has(segment.processId!)).toBe(true)
      expect(segment.startTime).toBeGreaterThanOrEqual(byId.get(segment.processId!)!.arrivalTime)
      busy += segment.duration
    }
    previousEnd = segment.endTime
  }
  const waits: number[] = [], turnarounds: number[] = [], responses: number[] = []
  for (const process of result.processes) {
    const original = byId.get(process.id)!
    const history = result.segments.filter(segment => !segment.isIdle && segment.processId === process.id)
    expect(history.reduce((sum, segment) => sum + segment.duration, 0)).toBe(original.burstTime)
    expect(process.executionHistory).toEqual(history)
    expect(process.remainingTime).toBe(0)
    expect(process.executedTime).toBe(original.burstTime)
    expect(process.completionTime).toBe(history.at(-1)!.endTime)
    expect(process.firstStartTime).toBe(history[0].startTime)
    const turnaround = history.at(-1)!.endTime - original.arrivalTime
    const wait = turnaround - original.burstTime
    const response = history[0].startTime - original.arrivalTime
    expect(process.turnaroundTime).toBe(turnaround)
    expect(process.waitingTime).toBe(wait)
    expect(process.responseTime).toBe(response)
    expect(wait).toBeGreaterThanOrEqual(0)
    expect(response).toBeGreaterThanOrEqual(0)
    waits.push(wait); turnarounds.push(turnaround); responses.push(response)
  }
  const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
  expect(result.metrics.averageWaitingTime).toBe(average(waits))
  expect(result.metrics.averageTurnaroundTime).toBe(average(turnarounds))
  expect(result.metrics.averageResponseTime).toBe(average(responses))
  expect(busy).toBe(input.reduce((sum, process) => sum + process.burstTime, 0))
  expect(result.metrics.totalBusyTime).toBe(busy)
  expect(result.metrics.totalIdleTime).toBe(idle)
  expect(busy + idle).toBe(previousEnd)
  expect(result.metrics.totalObservedTime).toBe(previousEnd)
  expect(result.metrics.observationStartTime).toBe(0)
  expect(result.metrics.observationEndTime).toBe(previousEnd)
  expect(result.metrics.cpuUtilization).toBe(busy / previousEnd * 100)
  expect(result.metrics.throughput).toBe(input.length / previousEnd)
  let lastTimestamp = 0
  for (const [index, event] of result.events.entries()) {
    expect(event.sequence).toBe(index)
    expect(event.timestamp).toBeGreaterThanOrEqual(lastTimestamp)
    expect(event.timestamp).toBeLessThanOrEqual(previousEnd)
    expect(event.explanation.length).toBeGreaterThan(0)
    const queued = event.readyQueues.flatMap(queue => queue.processIds)
    expect(new Set(queued).size).toBe(queued.length)
    expect(queued).not.toContain(event.runningProcessId)
    if (input.length <= 20) for (const state of event.remainingBurstTimes) {
      const original = byId.get(state.processId)!
      expect(original.arrivalTime).toBeLessThanOrEqual(event.timestamp)
      const executed = result.segments.filter(segment => !segment.isIdle && segment.processId === state.processId)
        .reduce((sum, segment) => sum + Math.max(0, Math.min(segment.endTime, event.timestamp) - segment.startTime), 0)
      expect(state.remainingTime).toBe(original.burstTime - executed)
    }
    lastTimestamp = event.timestamp
  }
}

const allConfigs: SchedulingConfig[] = [
  { algorithm: 'FCFS' }, { algorithm: 'SJF' }, { algorithm: 'NPP' }, { algorithm: 'SRTF' },
  { algorithm: 'PP' }, { algorithm: 'RR', quantum: 2 }, MLQ_LECTURE_PRESET, MLFQ_PRESET_2_3,
]
function checked(input: readonly SchedulingProcess[], config: SchedulingConfig) {
  const result = schedule(input, config)
  verify(result, input)
  return result
}

describe('independently verified schedules', () => {
  it('matches the requested FCFS example without rounding averages', () => {
    const input = workload([0, 2, 4], [5, 3, 4])
    const result = checked(input, { algorithm: 'FCFS' })
    expect(slices(result)).toEqual([['P1', 0, 5], ['P2', 5, 8], ['P3', 8, 12]])
    expect(result.processes.map(p => [p.completionTime, p.turnaroundTime, p.waitingTime])).toEqual([[5, 5, 0], [8, 6, 3], [12, 8, 4]])
    expect(result.metrics.averageWaitingTime).toBe(7 / 3)
    expect(result.metrics.averageTurnaroundTime).toBe(19 / 3)
  })
  it('matches the requested SRTF example with multiple preemptions', () => {
    const result = checked(workload([0, 1, 2], [8, 4, 2]), { algorithm: 'SRTF' })
    expect(slices(result)).toEqual([['P1', 0, 1], ['P2', 1, 2], ['P3', 2, 4], ['P2', 4, 7], ['P1', 7, 14]])
    expect(result.processes.map(p => p.completionTime)).toEqual([14, 7, 4])
  })
  it('SJF considers only arrived processes and does not interrupt for a shorter arrival', () => {
    const result = checked(workload([0, 1, 0], [8, 1, 3]), { algorithm: 'SJF' })
    expect(slices(result)).toEqual([['P3', 0, 3], ['P2', 3, 4], ['P1', 4, 12]])
  })
  it('NPP runs to completion while PP performs repeated strict-priority preemptions', () => {
    const input = workload([0, 1, 2], [5, 3, 1], [3, 2, 1])
    expect(slices(checked(input, { algorithm: 'NPP' }))).toEqual([['P1', 0, 5], ['P3', 5, 6], ['P2', 6, 9]])
    expect(slices(checked(input, { algorithm: 'PP' }))).toEqual([['P1', 0, 1], ['P2', 1, 2], ['P3', 2, 3], ['P2', 3, 5], ['P1', 5, 9]])
  })
  it.each(['NPP', 'PP'] as const)('%s supports higher-number-first priority', algorithm => {
    const input = workload([0, 0, 0], [1, 1, 1], [1, 5, 3])
    expect(slices(checked(input, { algorithm, priorityDirection: 'higher-first' })).map(slice => slice[0])).toEqual(['P2', 'P3', 'P1'])
  })
  it('SRTF retains the current process on equal remaining time', () => {
    const result = checked(workload([0, 1], [3, 2]), { algorithm: 'SRTF' })
    expect(slices(result)).toEqual([['P1', 0, 3], ['P2', 3, 5]])
    expect(result.events.filter(e => e.type === 'process-preempted')).toHaveLength(0)
  })
  it('PP retains the current process on equal priority', () => {
    const result = checked(workload([0, 1], [3, 1], [2, 2]), { algorithm: 'PP' })
    expect(slices(result)).toEqual([['P1', 0, 3], ['P2', 3, 4]])
  })
  it('PP applies configurable priority direction to preemption as well as selection', () => {
    const result = checked(workload([0, 1, 2], [5, 2, 1], [1, 3, 2]), { algorithm: 'PP', priorityDirection: 'higher-first' })
    expect(slices(result)).toEqual([['P1', 0, 1], ['P2', 1, 3], ['P3', 3, 4], ['P1', 4, 8]])
  })
  it('RR admits quantum-boundary arrivals before requeuing the current process', () => {
    const result = checked(workload([0, 2, 1], [4, 1, 1]), { algorithm: 'RR', quantum: 2 })
    expect(slices(result)).toEqual([['P1', 0, 2], ['P3', 2, 3], ['P2', 3, 4], ['P1', 4, 6]])
    const requeue = result.events.find(e => e.timestamp === 2 && e.type === 'process-requeued')!
    expect(requeue.readyQueues[0].processIds).toEqual(['P3', 'P2', 'P1'])
  })
  it.each([1, 2, 3, 20])('RR quantum %i conserves CPU time and bounds each turn', quantum => {
    const input = workload([0, 1, 4], [5, 3, 2])
    const result = checked(input, { algorithm: 'RR', quantum })
    expect(result.segments.filter(s => !s.isIdle).every(s => s.duration <= quantum)).toBe(true)
    expect(timeline(result)).toEqual(referenceTimeline(input, 'RR', quantum))
  })
})

describe.each(allConfigs)('$algorithm shared correctness contracts', config => {
  it('handles a single process, initial idle, and deterministic repeated runs', () => {
    const input = workload([3], [5], [0], [1])
    const result = checked(input, config)
    expect(result.processes[0].completionTime).toBe(8)
    expect(result.metrics.totalIdleTime).toBe(3)
    expect(schedule(input, config)).toEqual(result)
  })
  it('uses original input order for simultaneous equal-ranked processes', () => {
    const input = workload([0, 0], [2, 2], [1, 1], [1, 1])
    const result = checked([...input].reverse(), config)
    expect(result.segments[0].processId).toBe('P1')
    expect(schedule(input, config)).toEqual(result)
  })
  it('records initial and intermediate idle time using observation time zero', () => {
    const result = checked(workload([2, 6], [1, 1], [0, 0], [1, 1]), config)
    expect(slices(result)).toEqual([[null, 0, 2], ['P1', 2, 3], [null, 3, 6], ['P2', 6, 7]])
    expect(result.metrics.totalIdleTime).toBe(5)
    expect(result.metrics.cpuUtilization).toBe(2 / 7 * 100)
  })
  it('preserves conservation over varied finite workloads', () => {
    for (let seed = 0; seed < 8; seed++) {
      const input = workload(Array.from({ length: 6 }, (_, i) => (i * 7 + seed * 3) % 13),
        Array.from({ length: 6 }, (_, i) => 1 + (i * 3 + seed) % 7),
        Array.from({ length: 6 }, (_, i) => (i + seed) % 4),
        Array.from({ length: 6 }, (_, i) => config.algorithm === 'MLQ' ? 1 + i % 2 : 1))
      checked(input, config)
    }
  })
})

describe('MLQ fixed queue scheduling', () => {
  it('keeps queue membership fixed while higher-level arrivals interrupt lower levels', () => {
    const input = workload([0, 1], [5, 1], [0, 0], [2, 1])
    const result = checked(input, MLQ_LECTURE_PRESET)
    expect(slices(result)).toEqual([['P1', 0, 1], ['P2', 1, 2], ['P1', 2, 6]])
    for (const segment of result.segments) expect(segment.queueLevel).toBe(input.find(p => p.id === segment.processId)!.queueLevel)
  })
  it('uses configured queue priority, even when it differs from numeric level order', () => {
    const config: SchedulingConfig = { algorithm: 'MLQ', queues: [
      { level: 1, priority: 10, policy: { algorithm: 'FCFS' } }, { level: 2, priority: 0, policy: { algorithm: 'FCFS' } },
    ] }
    expect(slices(checked(workload([0, 0], [1, 1], [0, 0], [1, 2]), config))).toEqual([['P2', 0, 1], ['P1', 1, 2]])
  })
  it('can defer interqueue preemption until the current RR turn ends', () => {
    const input = workload([0, 1], [5, 1], [0, 0], [2, 1])
    const config: SchedulingConfig = { algorithm: 'MLQ', interqueuePreemption: false, queues: [
      { level: 1, priority: 0, policy: { algorithm: 'FCFS' } }, { level: 2, priority: 1, policy: { algorithm: 'RR', quantum: 3 } },
    ] }
    expect(slices(checked(input, config))).toEqual([['P1', 0, 3], ['P2', 3, 4], ['P1', 4, 6]])
    expect(slices(checked(input, { ...config, interqueuePreemption: true }))).toEqual([['P1', 0, 1], ['P2', 1, 2], ['P1', 2, 4], ['P1', 4, 6]])
  })
  it('still applies same-queue preemption when interqueue preemption is disabled', () => {
    const config: SchedulingConfig = { algorithm: 'MLQ', interqueuePreemption: false, queues: [
      { level: 1, priority: 0, policy: { algorithm: 'FCFS' } }, { level: 2, priority: 1, policy: { algorithm: 'SRTF' } },
    ] }
    const result = checked(workload([0, 1, 2], [8, 1, 1], [0, 0, 0], [2, 1, 2]), config)
    expect(slices(result)).toEqual([['P1', 0, 2], ['P2', 2, 3], ['P3', 3, 4], ['P1', 4, 10]])
  })
  it.each(['FCFS', 'SJF', 'NPP', 'SRTF', 'PP', 'RR'] as const)('supports %s as an individual queue policy', algorithm => {
    const policy = algorithm === 'RR' ? { algorithm, quantum: 2 } : { algorithm }
    const input = workload([0, 1, 2], [5, 3, 1], [3, 2, 1], [1, 1, 1])
    const result = checked(input, { algorithm: 'MLQ', queues: [{ level: 1, priority: 0, policy }] })
    expect(timeline(result)).toEqual(referenceTimeline(input, algorithm))
  })
})

describe('MLFQ feedback, quantum accounting, promotions, and boosts', () => {
  it('demotes on full budget use and retains remaining quantum across higher-level interruption', () => {
    const result = checked(workload([0, 3], [8, 1]), MLFQ_PRESET_2_3)
    expect(result.segments.map(s => [s.processId, s.startTime, s.endTime, s.queueLevel])).toEqual([
      ['P1', 0, 2, 1], ['P1', 2, 3, 2], ['P2', 3, 4, 1], ['P1', 4, 6, 2], ['P1', 6, 9, 3],
    ])
    expect(result.events.filter(e => e.type === 'process-demoted').map(e => e.timestamp)).toEqual([2, 6])
  })
  it('interrupts the bottom SJF level for a higher-priority arrival', () => {
    const result = checked(workload([0, 4], [8, 1]), { ...MLFQ_PRESET_1_2, levels: [
      { level: 1, policy: { algorithm: 'RR', quantum: 1 } }, { level: 2, policy: { algorithm: 'RR', quantum: 1 } }, { level: 3, policy: { algorithm: 'SJF' } },
    ] })
    expect(slices(result)).toEqual([['P1', 0, 1], ['P1', 1, 2], ['P1', 2, 4], ['P2', 4, 5], ['P1', 5, 9]])
  })
  it('promotes a waiting process one level through aging without aging the running process', () => {
    const result = checked(workload([0, 0], [6, 1], undefined, [1, 3]), { ...MLFQ_PRESET_1_2, agingInterval: 2 })
    expect(slices(result)).toEqual([['P1', 0, 1], ['P1', 1, 3], ['P2', 3, 4], ['P1', 4, 7]])
    expect(result.events.filter(e => e.type === 'process-promoted').map(e => [e.processId, e.timestamp])).toEqual([['P2', 2]])
  })
  it('periodically boosts unfinished processes, resetting budgets and preserving ready order', () => {
    const result = checked(workload([0, 0], [8, 4]), { ...MLFQ_PRESET_2_3, boostInterval: 5 })
    expect(slices(result)).toEqual([['P1', 0, 2], ['P2', 2, 4], ['P1', 4, 5], ['P2', 5, 7], ['P1', 7, 9], ['P1', 9, 10], ['P1', 10, 12]])
    expect(result.events.filter(e => e.type === 'priority-boost').map(e => e.timestamp)).toEqual([5, 10])
    expect(result.processes.map(p => p.completionTime)).toEqual([12, 7])
  })
  it('supports explicit timed priority promotion and logs inapplicable requests', () => {
    const result = checked(workload([0, 0], [8, 1], undefined, [1, 3]), { ...MLFQ_PRESET_2_3,
      priorityPromotions: [{ time: 3, processId: 'P2', targetQueueLevel: 1 }, { time: 4, processId: 'P2', targetQueueLevel: 1 }],
    })
    expect(slices(result)).toEqual([['P1', 0, 2], ['P1', 2, 3], ['P2', 3, 4], ['P1', 4, 6], ['P1', 6, 9]])
    expect(result.events.some(e => e.type === 'promotion-skipped' && e.timestamp === 4)).toBe(true)
  })
  it('skips empty-system boost ticks while preserving the global boost clock', () => {
    const result = checked(workload([1001], [1]), { ...MLFQ_PRESET_2_3, boostInterval: 5 })
    expect(result.events.filter(e => e.type === 'priority-boost')).toHaveLength(0)
    expect(result.events.length).toBeLessThan(10)
    expect(result.processes[0].completionTime).toBe(1002)
  })
  it('handles arrivals, quantum expiration, and a boost at the same timestamp', () => {
    const result = checked(workload([0, 2], [5, 1]), { ...MLFQ_PRESET_2_3, boostInterval: 2 })
    expect(slices(result)).toEqual([['P1', 0, 2], ['P2', 2, 3], ['P1', 3, 4], ['P1', 4, 6]])
    const events = result.events.filter(e => e.timestamp === 2)
    expect(events.findIndex(e => e.type === 'process-arrived')).toBeLessThan(events.findIndex(e => e.type === 'process-requeued'))
    expect(events.find(e => e.type === 'priority-boost')!.readyQueues[0].processIds).toEqual(['P2', 'P1'])
  })
  it('terminates with combined aging, boosts, and arrivals', () => {
    checked(workload([0, 1, 3, 6], [8, 5, 3, 2]), { ...MLFQ_PRESET_1_2, agingInterval: 2, boostInterval: 4 })
  })
})

describe('lecture image transcriptions and discrepancy audit', () => {
  it.each(lectureExamples)('verifies page $page ($config.algorithm)', example => {
    const result = checked(example.processes, example.config)
    expect(coalesce(slices(result))).toEqual(coalesce(example.expected))
    expect(result.processes.map(process => process.completionTime)).toEqual(example.completion)
    if (example.lectureCompletion) expect(result.processes.map(process => process.completionTime)).not.toEqual(example.lectureCompletion)
  })
  it('preserves the separate equal-priority regression while page 19 uses the verified priority 1', () => {
    const example = lectureExamples.find(item => item.page === 19)!
    expect(example.processes[2].priority).toBe(1)
    const input = example.processes.map(p => p.id === 'P3' ? { ...p, priority: 2 } : p)
    expect(checked(input, example.config).processes.map(p => p.completionTime)).toEqual([22, 12, 26, 6, 20])
  })
  it.each([27, 28])('does not silently present the page %i deferred-turn trace as strict-preemption MLFQ', page => {
    const example = lectureExamples.find(item => item.page === page)!
    expect(coalesce(slices(checked(example.processes, { ...example.config, interqueuePreemption: true } as SchedulingConfig)))).not.toEqual(coalesce(example.expected))
  })
})

describe('engine isolation, larger workloads, and independent oracle', () => {
  it('does not mutate frozen inputs/configs and returns detached histories and event snapshots', () => {
    const input = Object.freeze(workload([0, 1], [4, 2], [1, 1]).map(p => Object.freeze(p)))
    const config = Object.freeze({ algorithm: 'RR' as const, quantum: 2 })
    const result = checked(input, config)
    expect(input[0].burstTime).toBe(4)
    expect(result.events[0].readyQueues).not.toBe(result.events[1].readyQueues)
    expect(result.processes[0].executionHistory[0]).not.toBe(result.segments[0])
    result.events[0].readyQueues[0].processIds.push('changed')
    expect(result.events[1].readyQueues[0].processIds).not.toContain('changed')
  })
  it('handles 500 simultaneous processes with exact metrics and complete logs', () => {
    const input = workload(Array(500).fill(0), Array(500).fill(1))
    const result = checked(input, { algorithm: 'FCFS' })
    expect(result.metrics.averageWaitingTime).toBe(249.5)
    expect(result.metrics.averageTurnaroundTime).toBe(250.5)
    expect(result.metrics.cpuUtilization).toBe(100)
  })
  it('jumps over trillion-unit idle/burst durations instead of looping over ticks', () => {
    const result = checked(workload([1_000_000_000_000], [1_000_000_000_000]), { algorithm: 'SRTF' })
    expect(result.segments).toHaveLength(2)
    expect(result.processes[0].completionTime).toBe(2_000_000_000_000)
  })
  it.each(['FCFS', 'SJF', 'NPP', 'SRTF', 'PP', 'RR'] as const)('cross-checks %s against an independent tick oracle', algorithm => {
    for (let seed = 0; seed < 20; seed++) {
      const input = workload(Array.from({ length: 5 }, (_, i) => (i * 3 + seed) % 8),
        Array.from({ length: 5 }, (_, i) => 1 + (i + seed * 3) % 5), Array.from({ length: 5 }, (_, i) => (i * 2 + seed) % 3))
      const result = checked(input, algorithm === 'RR' ? { algorithm, quantum: 2 } : { algorithm })
      expect(timeline(result)).toEqual(referenceTimeline(input, algorithm))
    }
  })
})

describe('input validation and explicit resource failures', () => {
  const valid = () => workload([0], [2], [1], [1])
  it.each([
    ['arrivalTime', -1], ['arrivalTime', 0.5], ['arrivalTime', NaN], ['arrivalTime', Infinity],
    ['burstTime', 0], ['burstTime', -1], ['burstTime', 1.5], ['burstTime', NaN], ['burstTime', Infinity],
    ['priority', -1], ['priority', 0.1], ['priority', Infinity], ['priority', NaN],
    ['queueLevel', 0], ['queueLevel', 3], ['queueLevel', 1.2], ['queueLevel', NaN],
    ['originalInputOrder', -1], ['originalInputOrder', 0.5],
  ])('rejects invalid %s = %s', (field, value) => {
    expect(() => schedule([{ ...valid()[0], [field]: value }], { algorithm: 'NPP' })).toThrow(SchedulingValidationError)
  })
  it.each([0, -1, 1.5, NaN, Infinity])('rejects invalid quantum %s', quantum => {
    expect(() => schedule(valid(), { algorithm: 'RR', quantum })).toThrow(SchedulingValidationError)
  })
  it('rejects empty datasets, blank/duplicate IDs, duplicate order values, and missing priority', () => {
    expect(() => schedule([], { algorithm: 'FCFS' })).toThrow(/nonempty/)
    expect(() => schedule([{ ...valid()[0], id: ' ' }], { algorithm: 'FCFS' })).toThrow(/nonblank/)
    expect(() => schedule([...valid(), ...valid()], { algorithm: 'FCFS' })).toThrow(/Duplicate process ID/)
    expect(() => schedule([...valid(), { ...valid()[0], id: 'P2' }], { algorithm: 'FCFS' })).toThrow(/originalInputOrder/)
    expect(() => schedule(workload([0], [1]), { algorithm: 'PP' })).toThrow(/priority/)
  })
  it('rejects missing MLQ assignments and unsupported or malformed configurations', () => {
    expect(() => schedule(workload([0], [1], [0]), MLQ_LECTURE_PRESET)).toThrow(/queueLevel/)
    const invalid: unknown[] = [
      { algorithm: 'unknown' }, { algorithm: 'toString' }, { algorithm: 'RR' }, { algorithm: 'FCFS', quantum: 2 },
      { algorithm: 'NPP', priorityDirection: 'random' }, { ...MLQ_LECTURE_PRESET, interqueuePreemption: 'yes' },
      { algorithm: 'NPP', priorityDirection: { toString: () => 'lower-first' } },
      { algorithm: 'MLQ', queues: [] }, { ...MLQ_LECTURE_PRESET, queues: [{ level: 2, priority: 0, policy: { algorithm: 'FCFS' } }] },
      { algorithm: 'MLQ', queues: [{ level: 1, priority: 0, policy: { algorithm: { toString: () => 'FCFS' } } }] },
      { algorithm: 'MLQ', queues: [{ level: 1, priority: 0, policy: { algorithm: 'RR', quantum: 0 } }] },
      { algorithm: 'MLQ', queues: [{ level: 1, priority: 0, policy: { algorithm: 'FCFS' } }, { level: 1, priority: 1, policy: { algorithm: 'FCFS' } }] },
      { ...MLFQ_PRESET_2_3, levels: [{ level: 1, policy: { algorithm: 'SJF' } }, { level: 2, policy: { algorithm: 'FCFS' } }] },
      { ...MLFQ_PRESET_2_3, agingInterval: 0 }, { ...MLFQ_PRESET_2_3, boostInterval: Infinity },
      { ...MLFQ_PRESET_2_3, priorityPromotions: [{ time: 1, processId: 'unknown', targetQueueLevel: 1 }] },
      { ...MLFQ_PRESET_2_3, priorityPromotions: [{ time: 1, processId: 'P1', targetQueueLevel: 4 }] },
      { algorithm: 'FCFS', limits: { maxEvents: 0 } },
    ]
    for (const config of invalid) expect(() => schedule(valid(), config as SchedulingConfig)).toThrow(SchedulingValidationError)
  })
  it('rejects unsafe arithmetic before simulation', () => {
    expect(() => schedule(workload([Number.MAX_SAFE_INTEGER], [1]), { algorithm: 'FCFS' })).toThrow(/safe-integer/)
  })
  it.each([
    { maxTransitions: 1 }, { maxSegments: 1 }, { maxEvents: 1 }, { maxSnapshotEntries: 1 },
  ])('raises a descriptive limit error rather than returning a partial schedule (%j)', limits => {
    expect(() => schedule(workload([0, 0], [3, 3]), { algorithm: 'RR', quantum: 1, limits })).toThrow(SchedulingLimitError)
  })
  it('treats arbitrary string IDs as IDs, not object keys or the IDLE sentinel', () => {
    const input = workload([0, 2], [1, 1]).map((p, i) => ({ ...p, id: i === 0 ? '__proto__' : 'IDLE' }))
    const result = checked(input, { algorithm: 'FCFS' })
    expect(result.segments[1].isIdle).toBe(true)
    expect(result.segments[2].processId).toBe('IDLE')
    expect(result.segments[2].isIdle).toBe(false)
  })
})
