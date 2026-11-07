import { describe, expect, it } from 'vitest'
import { algorithms } from '../data/algorithms'
import { generatePracticeProblem } from '../utils/practiceGenerator'
import { checkGantt, checkPracticeAnswers, emptyPracticeAnswers, mergeContinuous, parseStudentNumber, ANSWER_TOLERANCE } from '../utils/answerChecker'
import { practiceHints } from '../utils/practiceHints'
import { executeSimulation } from '../services/simulationTask'
import { runSimulation } from '../services/schedulerClient'
import { draftFromRequest, prepareRequest } from '../utils/calculator'
import type { Difficulty, PracticeProblem } from '../types/learning'
import type { SchedulingResult } from '../types/scheduling'

// Test-only answers. The application never fills a student's form from a result.
export function correctAnswers(problem: PracticeProblem, result: SchedulingResult) {
  const answers = emptyPracticeAnswers(problem)
  for (const p of result.processes) answers.processes[p.id] = { completionTime: `${p.completionTime}.0`, turnaroundTime: String(p.turnaroundTime), waitingTime: String(p.waitingTime), responseTime: String(p.responseTime) }
  answers.segments = result.segments.map((s, i) => ({ id: i + 1, processId: s.processId ?? 'IDLE', start: String(s.startTime), end: String(s.endTime) }))
  answers.nextSegmentId = answers.segments.length + 1
  for (const key of ['averageWaitingTime', 'averageTurnaroundTime', 'averageResponseTime', 'cpuUtilization'] as const) answers.averages[key] = result.metrics[key].toFixed(4)
  return answers
}
const cases = algorithms.flatMap(a => (['easy', 'medium', 'hard'] as Difficulty[]).map(difficulty => ({ algorithm: a.id, difficulty })))
describe('deterministic, supported practice generation and calculator equivalence', () => {
  it.each(cases)('$algorithm / $difficulty produces valid, reproducible, genuinely solvable problems', async options => {
    for (const seed of ['lecture-training', 'another-seed', 'edge-0']) {
      const problem = generatePracticeProblem({ ...options, seed, advanced: true })
      expect(problem).toEqual(generatePracticeProblem({ ...options, seed, advanced: true }))
      expect(problem.processes.length).toBeGreaterThanOrEqual(options.difficulty === 'easy' ? 3 : options.difficulty === 'medium' ? 4 : 5)
      expect(problem.processes.length).toBeLessThanOrEqual(options.difficulty === 'easy' ? 3 : options.difficulty === 'medium' ? 5 : 8)
      expect(new Set(problem.processes.map(p => p.id)).size).toBe(problem.processes.length)
      const solution = executeSimulation(problem), answers = correctAnswers(problem, solution)
      expect(checkPracticeAnswers(problem, answers, solution).percentage).toBeCloseTo(100)
      expect(solution.metrics.totalBusyTime).toBe(problem.processes.reduce((sum, p) => sum + p.burstTime, 0))
      if (options.difficulty === 'hard') expect(solution.segments[0]).toMatchObject({ isIdle: true, startTime: 0, endTime: 2 })
      // Exercise the same draft adapter, validation and asynchronous service as the main calculator.
      const prepared = prepareRequest(draftFromRequest(problem))
      expect(prepared.errors).toEqual({})
      const mainResult = await runSimulation(prepared.request!, new AbortController().signal)
      expect(mainResult).toEqual(solution)
      expect(checkPracticeAnswers(problem, answers, mainResult).percentage).toBeCloseTo(100)
    }
  })
  it('changes with seeds and rejects unsupported or blank inputs', () => {
    expect(generatePracticeProblem({ algorithm: 'RR', difficulty: 'hard', seed: 'a' }).processes).not.toEqual(generatePracticeProblem({ algorithm: 'RR', difficulty: 'hard', seed: 'b' }).processes)
    expect(() => generatePracticeProblem({ algorithm: 'FCFS', difficulty: 'easy', seed: ' ' })).toThrow(/seed/)
    expect(() => generatePracticeProblem({ algorithm: 'FCFS', difficulty: 'easy', seed: 'a'.repeat(65) })).toThrow(/seed/)
  })
  it.each(['SRTF', 'PP', 'MLQ'] as const)('hard %s has multiple actual interruptions', algorithm => {
    const r = executeSimulation(generatePracticeProblem({ algorithm, difficulty: 'hard', seed: 'interruptions' }))
    expect(r.events.filter(e => e.type === 'process-preempted').length).toBeGreaterThanOrEqual(2)
  })
  it('MLQ keeps membership and MLFQ actually demotes after quantum use', () => {
    const mlq = generatePracticeProblem({ algorithm: 'MLQ', difficulty: 'hard' }), result = executeSimulation(mlq)
    for (const p of result.processes) expect(p.executionHistory.every(s => s.queueLevel === p.queueLevel)).toBe(true)
    const feedback = executeSimulation(generatePracticeProblem({ algorithm: 'MLFQ', difficulty: 'hard' }))
    expect(feedback.events.some(e => e.type === 'process-demoted')).toBe(true)
    expect(feedback.segments.some(s => s.queueLevel === 3)).toBe(true)
  })
})
describe('answer validation and transparent scoring', () => {
  const problem = generatePracticeProblem({ algorithm: 'FCFS', difficulty: 'easy', seed: 'grading', advanced: true }), result = executeSimulation(problem)
  it('awards no points for blanks and excludes unselected advanced fields', () => {
    const empty = checkPracticeAnswers(problem, emptyPracticeAnswers(problem), result)
    expect(empty.earned).toBe(0); expect(empty.items.every(i => i.status === 'missing')).toBe(true)
    const core = { ...problem, advanced: false }, answers = correctAnswers(core, result)
    answers.averages = {}; for (const p of Object.values(answers.processes)) delete p.responseTime
    const evaluation = checkPracticeAnswers(core, answers, result)
    expect(evaluation.earned).toBeCloseTo(100); expect(evaluation.categories).toHaveLength(4)
    expect(evaluation.categories[0].maximum).toBeCloseTo(40 / 90 * 100)
  })
  it('uses numerical equality, scores partial categories, and supplies actual substituted formulas', () => {
    const answers = correctAnswers(problem, result), copy = structuredClone(answers)
    expect(checkPracticeAnswers(problem, answers, result).items.every(i => i.status === 'correct')).toBe(true)
    expect(answers).toEqual(copy)
    answers.processes.P2.waitingTime = '999'
    const e = checkPracticeAnswers(problem, answers, result), item = e.items.find(i => i.key === 'P2.waitingTime')!
    expect(item.status).toBe('incorrect'); expect(item.expected).toBe(String(result.processes[1].waitingTime))
    expect(item.explanation).toContain(`WT = ${result.processes[1].turnaroundTime} − ${result.processes[1].burstTime}`)
    expect(e.percentage).toBeCloseTo(95)
  })
  it('accepts four decimal rounding and the tolerance boundary but rejects larger errors', () => {
    const a = correctAnswers(problem, result), value = result.metrics.averageWaitingTime
    a.averages.averageWaitingTime = String(value + ANSWER_TOLERANCE)
    expect(checkPracticeAnswers(problem, a, result).items.find(i => i.key === 'averageWaitingTime')?.status).toBe('correct')
    a.averages.averageWaitingTime = String(value + 0.000051)
    expect(checkPracticeAnswers(problem, a, result).items.find(i => i.key === 'averageWaitingTime')?.status).toBe('incorrect')
  })
  it.each(['NaN', 'Infinity', '-1', '0x10', '1e2', '1.5', '9007199254740992'])('rejects invalid integer answer %s', value => expect(parseStudentNumber(value, true).status).toBe('invalid'))
  it('treats whitespace as missing and equivalent decimal integers as equal', () => { expect(parseStudentNumber('  ', true).status).toBe('missing'); expect(parseStudentNumber(' 5.0 ', true).value).toBe(5) })
})
describe('canonical Gantt assessment', () => {
  const solo = (algorithm: 'FCFS' | 'RR' | 'MLFQ'): PracticeProblem => ({ ...generatePracticeProblem({ algorithm, difficulty: 'easy' }), processes: [{ id: 'P1', arrivalTime: 0, burstTime: 8, originalInputOrder: 0 }] })
  it('accepts continuous same-process merging and extra decimal display cuts without mutating expected segments', () => {
    const p = solo('FCFS'), r = executeSimulation(p), a = correctAnswers(p, r), before = structuredClone(r.segments)
    a.segments = [{ id: 1, processId: 'P1', start: '0.0', end: '2.5' }, { id: 2, processId: 'P1', start: '2.5', end: '8.0' }]
    expect(checkGantt(p, a, r.segments).status).toBe('correct'); expect(r.segments).toEqual(before)
  })
  it.each(['RR', 'MLFQ'] as const)('requires meaningful %s boundaries, even for a continuously running lone process', algorithm => {
    const p = solo(algorithm), r = executeSimulation(p), a = correctAnswers(p, r)
    a.segments = [{ id: 1, processId: 'P1', start: '0', end: '8' }]
    expect(checkGantt(p, a, r.segments).status).toBe('incorrect')
    a.segments = correctAnswers(p, r).segments
    const first = a.segments[0], middle = (Number(first.start) + Number(first.end)) / 2
    a.segments.splice(0, 1, { ...first, end: String(middle) }, { ...first, id: 99, start: String(middle) })
    expect(checkGantt(p, a, r.segments).status).toBe('correct')
  })
  it.each(['gap', 'overlap', 'reversed', 'zero', 'unknown', 'before-arrival', 'wrong-owner'] as const)('rejects %s charts', kind => {
    const p = generatePracticeProblem({ algorithm: 'FCFS', difficulty: 'hard' }), r = executeSimulation(p), a = correctAnswers(p, r)
    if (kind === 'gap') a.segments[1].start = String(Number(a.segments[1].start) + 1)
    if (kind === 'overlap') a.segments[1].start = '1'
    if (kind === 'reversed') a.segments.reverse()
    if (kind === 'zero') a.segments[0].end = '0'
    if (kind === 'unknown') a.segments[0].processId = 'P999'
    if (kind === 'before-arrival') a.segments[0].processId = 'P1'
    if (kind === 'wrong-owner') a.segments[1].processId = 'IDLE'
    expect(checkGantt(p, a, r.segments).status).not.toBe('correct')
  })
  it('never merges across a gap or another owner', () => expect(mergeContinuous([{ processId: 'P1', startTime: 0, endTime: 1 }, { processId: 'P1', startTime: 2, endTime: 3 }])).toHaveLength(2))
})
describe('actual progressive hints', () => {
  it.each(algorithms)('$id hints identify a real decision and only one partial interval', a => {
    const p = generatePracticeProblem({ algorithm: a.id, difficulty: 'hard' }), r = executeSimulation(p), hints = practiceHints(p, r), first = r.segments.find(s => !s.isIdle)!
    expect(hints).toHaveLength(3); expect(hints[0]).toContain(a.principle)
    expect(hints[1]).toContain(`time ${first.startTime}`)
    expect(hints[2]).toContain(`${first.processId} from ${first.startTime} to ${first.endTime}`)
  })
})
