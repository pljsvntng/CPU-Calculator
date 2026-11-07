import type { PracticeProblem, PracticeAnswers, AnswerFeedback, AnswerMetric, PracticeEvaluation } from '../types/learning'
import type { SchedulingResult, GanttSegment } from '../types/scheduling'
import { processFormulas, performanceFormulas } from './resultFormatting'
import { scorePractice } from './practiceScoring'

export const ANSWER_TOLERANCE = 0.00005
export function parseStudentNumber(raw: string, integer: boolean): { value: number | null; status: 'valid' | 'missing' | 'invalid' } {
  if (!raw.trim()) return { value: null, status: 'missing' }
  const value = Number(raw)
  // Number() can round a long fractional spelling to an integer. Reject that
  // spelling before numerical equality can award credit to an inaccurate answer.
  if (integer && /\.[0-9]*[1-9]/.test(raw.trim())) return { value: null, status: 'invalid' }
  if (raw.length > 40 || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw.trim()) || !Number.isFinite(value) || value < 0 || (integer && !Number.isSafeInteger(value))) return { value: null, status: 'invalid' }
  return { value, status: 'valid' }
}
export function emptyPracticeAnswers(problem: PracticeProblem): PracticeAnswers {
  return { processes: Object.fromEntries(problem.processes.map(process => [process.id, {}])), averages: {}, segments: [], nextSegmentId: 1 }
}
export function mergeContinuous(segments: { processId: string | null; startTime: number; endTime: number }[]) {
  const merged: typeof segments = []
  for (const segment of segments) {
    const last = merged.at(-1)
    if (last && last.processId === segment.processId && last.endTime === segment.startTime) last.endTime = segment.endTime
    else merged.push({ ...segment })
  }
  return merged
}
export function checkGantt(problem: PracticeProblem, answers: PracticeAnswers, expected: readonly GanttSegment[]): AnswerFeedback {
  const base = { key: 'gantt', label: 'Gantt chart', submitted: `${answers.segments.length} intervals`, expected: 'The verified continuous timeline and required boundaries' }
  if (!answers.segments.length) return { ...base, status: 'missing', explanation: 'Add execution intervals, including IDLE where no process is ready. An unanswered chart earns no points.' }
  const parsed: { processId: string | null; startTime: number; endTime: number }[] = []
  for (const [index, row] of answers.segments.entries()) {
    const start = parseStudentNumber(row.start, false), end = parseStudentNumber(row.end, false)
    if ([row.start,row.end].some(raw=>Number.isInteger(Number(raw)) && /\.[0-9]*[1-9]/.test(raw.trim()))) return { ...base, status: 'invalid', explanation: `Interval ${index + 1}: the fractional endpoint rounds to an integer in JavaScript. Enter the exact timestamp; rounded scheduling boundaries are not accepted.` }
    if (start.status === 'missing' || end.status === 'missing' || !row.processId) return { ...base, status: 'missing', explanation: `Interval ${index + 1}: process, start and end are required.` }
    const process = problem.processes.find(process => process.id === row.processId)
    if (start.status !== 'valid' || end.status !== 'valid' || end.value! <= start.value! || end.value! > Number.MAX_SAFE_INTEGER || (!process && row.processId !== 'IDLE')) return { ...base, status: 'invalid', explanation: `Interval ${index + 1}: use a known process or IDLE and finite non-negative endpoints with end > start. Decimal display subdivisions are allowed; actual scheduling boundaries must still match.` }
    if (start.value !== (parsed.at(-1)?.endTime ?? 0)) return { ...base, status: 'invalid', explanation: `Interval ${index + 1}: start must equal ${parsed.at(-1)?.endTime ?? 0}. Remove gaps/overlaps or reorder the rows.` }
    if (process && start.value! < process.arrivalTime) return { ...base, status: 'invalid', explanation: `${process.id} has not arrived at time ${start.value}; its AT is ${process.arrivalTime}.` }
    parsed.push({ processId: row.processId === 'IDLE' ? null : row.processId, startTime: start.value!, endTime: end.value! })
  }
  const actual = mergeContinuous(parsed), canonical = mergeContinuous(expected.map(segment => ({ processId: segment.processId, startTime: segment.startTime, endTime: segment.endTime })))
  const mismatch = canonical.findIndex((segment, index) => !actual[index] || segment.processId !== actual[index].processId || segment.startTime !== actual[index].startTime || segment.endTime !== actual[index].endTime)
  if (actual.length !== canonical.length || mismatch >= 0) {
    const segment = canonical[Math.max(0, mismatch)]
    return { ...base, status: 'incorrect', explanation: `The timeline differs. One required continuous interval is ${segment.processId ?? 'IDLE'} ${segment.startTime}–${segment.endTime}. Review arrivals and the configured selection rule.` }
  }
  if (problem.boundaryMode === 'decisions') {
    const boundaries = new Set(parsed.map(segment => segment.endTime))
    const missing = expected.find(segment => !boundaries.has(segment.endTime))
    if (missing) return { ...base, status: 'incorrect', explanation: `Preserve the scheduling boundary at time ${missing.endTime}. This mission explicitly assesses quantum, dispatch and queue-transition boundaries. Additional subdivisions are accepted.` }
  }
  return { ...base, status: 'correct', explanation: 'Continuous CPU ownership, idle intervals, exact timestamps and all required scheduling boundaries agree with the verified result.' }
}
export function checkPracticeAnswers(problem: PracticeProblem, answers: PracticeAnswers, result: SchedulingResult): PracticeEvaluation {
  const groups: { name: string; weight: number; items: AnswerFeedback[] }[] = [{ name: 'Gantt Chart', weight: 40, items: [checkGantt(problem, answers, result.segments)] }]
  const fields: [AnswerMetric, string, number, string][] = [['completionTime', 'Completion Times · ET', 20, 'completion'], ['turnaroundTime', 'Turnaround Times · TT', 15, 'turnaround'], ['waitingTime', 'Waiting Times · WT', 15, 'waiting']]
  const numeric = (key: string, label: string, raw: string, expected: number, integer: boolean, explanation: string): AnswerFeedback => {
    const parsed = parseStudentNumber(raw, integer)
    const status = parsed.status !== 'valid' ? parsed.status : (integer ? parsed.value === expected : Math.abs(parsed.value! - expected) <= ANSWER_TOLERANCE + 1e-12) ? 'correct' : 'incorrect'
    return { key, label, status, submitted: raw.trim() || 'Unanswered', expected: String(expected), explanation: status === 'invalid' ? `Enter a finite non-negative ${integer ? 'safe integer' : 'decimal number'}. ${explanation}` : explanation }
  }
  for (const [field, name, weight, formulaId] of fields) groups.push({ name, weight, items: result.processes.map(process => {
    const formula = processFormulas(process).find(model => model.id === formulaId)!
    return numeric(`${process.id}.${field}`, `${process.id} ${name.split(' · ')[1]}`, answers.processes[process.id]?.[field] ?? '', process[field], true, `${formula.formula}; ${formula.substitution}; ${formula.exact}.`)
  }) })
  if (problem.advanced) groups.push({ name: 'Advanced metrics', weight: 10, items: [
    ...result.processes.map(process => { const formula = processFormulas(process).find(model => model.id === 'response')!; return numeric(`${process.id}.responseTime`, `${process.id} RT`, answers.processes[process.id]?.responseTime ?? '', process.responseTime, true, `${formula.substitution}; ${formula.exact}.`) }),
    ...(['averageWaitingTime', 'averageTurnaroundTime', 'averageResponseTime', 'cpuUtilization'] as const).map((field, index) => {
      const formula = performanceFormulas(result).find(model => model.id === ['average-waiting', 'average-turnaround', 'average-response', 'utilization'][index])!
      return numeric(field, field, answers.averages[field] ?? '', result.metrics[field], false, `${formula.formula}; ${formula.substitution}; ${formula.exact}. Answers rounded to 4 decimals are accepted within ±${ANSWER_TOLERANCE}${field === 'cpuUtilization' ? ' percentage points' : ' CPU units'}.`)
    }),
  ] })
  return { items: groups.flatMap(group => group.items), ...scorePractice(groups) }
}
