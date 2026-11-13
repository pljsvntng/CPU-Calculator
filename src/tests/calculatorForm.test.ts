import { describe, expect, it } from 'vitest'
import { applyConfiguration, createCalculatorDraft, draftFromRequest, prepareRequest, resizeQueues } from '../utils/calculator'
import { generateRandomCrew, defaultRandomOptions } from '../utils/randomCrew'
import { executeSimulation } from '../services/simulationTask'
import { assertResultConsistent } from '../utils/resultConsistency'
import { lectureInputExamples } from '../data/lectureExamples'
import { lectureExamples } from './fixtures/lectureExamples'
import type { CalculatorDraft } from '../types'

function validDraft() {
  const draft = createCalculatorDraft()
  draft.processes = [{ id: 1, arrival: '0', burst: '5', priority: '1', queue: '1' }]
  return draft
}

describe('form-to-engine boundary', () => {
  it('requires real inputs and defaults Round Robin quantum to 2', () => {
    const draft = createCalculatorDraft()
    expect(draft.quantum).toBe('2')
    expect(prepareRequest(draft).request).toBeNull()
    expect(prepareRequest(draft).errors['process.1.arrival']).toMatch(/required/)
  })
  it.each(['', '-1', '1.5', 'NaN', 'Infinity'])('rejects invalid arrival text %j without altering it', arrival => {
    const draft = validDraft()
    draft.processes[0].arrival = arrival
    expect(prepareRequest(draft).request).toBeNull()
    expect(draft.processes[0].arrival).toBe(arrival)
  })
  it.each(['', '0', '-1', '0.5', 'NaN', 'Infinity'])('rejects invalid burst text %j', burst => {
    const draft = validDraft()
    draft.processes[0].burst = burst
    expect(prepareRequest(draft).errors['process.1.burst']).toBeDefined()
  })
  it('preserves hidden priorities and queues while omitting irrelevant fields from engine input', () => {
    const draft = validDraft()
    draft.processes[0].priority = ''
    draft.processes[0].queue = '8'
    const prepared = prepareRequest(draft)
    expect(prepared.request?.processes[0]).toEqual({ id: 'P1', arrivalTime: 0, burstTime: 5, originalInputOrder: 0 })
    expect(draft.processes[0].queue).toBe('8')
    expect(prepareRequest({ ...draft, algorithm: 'NPP' }).errors['process.1.priority']).toBeDefined()
    expect(prepareRequest({ ...draft, algorithm: 'MLQ' }).errors['process.1.queue']).toBeDefined()
  })
  it('rejects duplicate or invalid IDs and empty crews', () => {
    const draft = validDraft()
    expect(prepareRequest({ ...draft, processes: [] }).request).toBeNull()
    expect(prepareRequest({ ...draft, processes: [...draft.processes, ...draft.processes] }).request).toBeNull()
    expect(prepareRequest({ ...draft, processes: [{ ...draft.processes[0], id: 0 }] }).request).toBeNull()
  })
  it('preserves supported non-RR intermediate policies when resizing', () => {
    const draft = { ...validDraft(), algorithm: 'MLFQ' as const }
    draft.mlfqLevels = resizeQueues(draft.mlfqLevels, 4, true)
    expect(draft.mlfqLevels[2].policy).toBe('FCFS')
    expect(prepareRequest(draft).request).not.toBeNull()
    draft.mlfqLevels[2].policy = 'RR'
    expect(prepareRequest(draft).request).not.toBeNull()
  })
  it('validates queue RR quantum, optional aging, boost, and the exact engine range', () => {
    const draft = { ...validDraft(), algorithm: 'MLFQ' as const, agingEnabled: true, agingInterval: '0', boostEnabled: true, boostInterval: '' }
    draft.mlfqLevels[0].quantum = '0'
    const prepared = prepareRequest(draft)
    expect(prepared.errors['mlfq.1.quantum']).toBeDefined()
    expect(prepared.errors.agingInterval).toBeDefined()
    expect(prepared.errors.boostInterval).toBeDefined()
    const huge = validDraft()
    huge.processes[0].arrival = String(Number.MAX_SAFE_INTEGER)
    expect(prepareRequest(huge).errors.configuration).toMatch(/safe-integer/)
  })
})

describe('lecture loading uses input data, never expected results', () => {
  it.each(lectureInputExamples)('connects page $page to the engine and its independently verified fixture', example => {
    const fixture = lectureExamples.find(item => item.page === example.page)!
    expect(example.processes.map(p => [p.id, p.arrivalTime, p.burstTime])).toEqual(fixture.processes.map(p => [p.id, p.arrivalTime, p.burstTime]))
    expect(example.config).toEqual(fixture.config)
    const prepared = prepareRequest(draftFromRequest(example))
    expect(prepared.request).not.toBeNull()
    const result = executeSimulation(prepared.request!)
    expect(result.processes.map(p => p.completionTime)).toEqual(fixture.completion)
  })
  it('keeps page 19 printed priorities and the explicit lecture queue assumptions visible', () => {
    expect(lectureInputExamples.find(e => e.page === 19)!.processes[2].priority).toBe(1)
    expect(lectureInputExamples.find(e => e.page === 19)!.note).toMatch(/rechecked/)
    expect(lectureInputExamples.find(e => e.page === 27)!.note).toMatch(/Deferred/)
  })
})

describe('random crew generation and consistency protection', () => {
  it.each(['FCFS', 'SJF', 'NPP', 'SRTF', 'PP', 'RR', 'MLQ', 'MLFQ'] as const)('generates immediately executable %s workloads', algorithm => {
    const draft: CalculatorDraft = { ...createCalculatorDraft(), algorithm }
    const options = { count: '20', maxArrival: '12', maxBurst: '7', minPriority: '2', maxPriority: '4' }
    let seed = 17
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const processes = generateRandomCrew(draft, options, random)
    expect(new Set(processes.map(p => p.id)).size).toBe(20)
    expect(processes.every(p => Number(p.arrival) >= 0 && Number(p.arrival) <= 12 && Number(p.burst) >= 1 && Number(p.burst) <= 7)).toBe(true)
    const request = prepareRequest({ ...draft, processes }).request
    expect(request).not.toBeNull()
    expect(executeSimulation(request!).metrics.completedProcesses).toBe(20)
  })
  it('rejects invalid random ranges and ignores hidden priority ranges for nonpriority algorithms', () => {
    expect(() => generateRandomCrew(createCalculatorDraft(), { ...defaultRandomOptions, count: '0' })).toThrow()
    const draft = { ...createCalculatorDraft(), algorithm: 'NPP' as const }
    expect(() => generateRandomCrew(draft, { ...defaultRandomOptions, minPriority: '8', maxPriority: '2' })).toThrow()
    expect(generateRandomCrew(createCalculatorDraft(), { ...defaultRandomOptions, minPriority: '', maxPriority: '' })).toHaveLength(5)
  })
  it('checks the result before success and rejects corrupted metrics or timestamps', () => {
    const request = prepareRequest(validDraft()).request!
    const result = executeSimulation(request)
    expect(() => assertResultConsistent(result, request)).not.toThrow()
    expect(() => assertResultConsistent({ ...result, metrics: { ...result.metrics, averageWaitingTime: 999 } }, request)).toThrow(/inconsistent/)
    expect(() => assertResultConsistent({ ...result, segments: [{ ...result.segments[0], startTime: 1 }] }, request)).toThrow(/inconsistent/)
    expect(() => assertResultConsistent({ ...result, processes: [{ ...result.processes[0], completionTime: 999 }] }, request)).toThrow(/inconsistent/)
  })
  it('applies only supported configuration values while retaining draft process fields', () => {
    const draft = validDraft()
    const next = applyConfiguration(draft, { algorithm: 'RR', quantum: 3 })
    expect(next.processes).toBe(draft.processes)
    expect(next.quantum).toBe('3')
    expect(next.processes[0].priority).toBe('1')
  })
})
