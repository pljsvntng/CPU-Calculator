import type { ScheduledProcess, SchedulingResult } from '../types/scheduling'
import { displayNumber } from './formatting'

export type ResultSortKey = 'id' | 'arrivalTime' | 'burstTime' | 'completionTime'
export function sortedProcesses(processes: readonly ScheduledProcess[], key: ResultSortKey, direction: 'ascending' | 'descending') {
  const sign = direction === 'ascending' ? 1 : -1
  return [...processes].sort((a, b) => sign * (key === 'id' ? a.id.localeCompare(b.id, 'en', { numeric: true }) : a[key] - b[key]) || a.originalInputOrder - b.originalInputOrder)
}
export const hasPriority = (result: SchedulingResult) => result.processes.some(process => process.priority !== undefined)
export const hasQueues = (result: SchedulingResult) => result.algorithm === 'MLQ' || result.algorithm === 'MLFQ'

export function resultTableText(result: SchedulingResult, processes = result.processes) {
  const columns = ['Process', 'AT', 'BT', 'ET/CT', 'TT/TAT', 'WT', 'RT', ...(hasPriority(result) ? ['Priority'] : []), ...(hasQueues(result) ? ['Initial Queue', 'Final Queue'] : [])]
  return `${result.algorithm} · CPU scheduling results\nObservation: ${result.metrics.observationStartTime}–${result.metrics.observationEndTime} CPU units\n${columns.join('\t')}\n${processes.map(process => [process.id, process.arrivalTime, process.burstTime, process.completionTime, process.turnaroundTime, process.waitingTime, process.responseTime,
    ...(hasPriority(result) ? [process.priority ?? 'Not required'] : []), ...(hasQueues(result) ? [process.queueLevel ?? 1, process.currentQueueLevel] : []),
  ].join('\t')).join('\n')}`
}
export interface FormulaModel {
  id: string; title: string; formula: string; substitution: string; exact: string; value: number | null; unit: string; note: string
  terms?: { label: string; value: number }[]
}
export const formulaResult = (model: FormulaModel) => model.value === null ? 'Undefined — no observation duration or processes.' : `${Number(displayNumber(model.value).replaceAll(',', '')) === model.value ? '=' : '≈'} ${displayNumber(model.value)}${model.unit === '%' ? '%' : model.unit ? ` ${model.unit}` : ''}`

export function processFormulas(process: ScheduledProcess): FormulaModel[] {
  return [
    { id: 'completion', title: 'Completion Time · ET/CT', formula: 'ET = timestamp of final completion', substitution: `ET = end of the last execution interval`, exact: `ET = ${process.completionTime}`, value: process.completionTime, unit: 'CPU units', note: 'ET is the lecture term. CT (completion time) is a common alternative.' },
    { id: 'turnaround', title: 'Turnaround Time · TT/TAT', formula: 'TT = ET − AT', substitution: `TT = ${process.completionTime} − ${process.arrivalTime}`, exact: `TT = ${process.turnaroundTime}`, value: process.turnaroundTime, unit: 'CPU units', note: 'Time from arrival until completion, including all waiting. TAT is a common alternative term.' },
    { id: 'waiting', title: 'Waiting Time · WT', formula: 'WT = TT − BT', substitution: `WT = ${process.turnaroundTime} − ${process.burstTime}`, exact: `WT = ${process.waitingTime}`, value: process.waitingTime, unit: 'CPU units', note: 'Total time waiting for the CPU across the entire schedule.' },
    { id: 'response', title: 'Response Time · RT', formula: 'RT = First Start Time − AT', substitution: `RT = ${process.firstStartTime} − ${process.arrivalTime}`, exact: `RT = ${process.responseTime}`, value: process.responseTime, unit: 'CPU units', note: 'Only the delay before the first CPU execution. Later waiting after interruption is included in WT, not RT.' },
  ]
}

export function performanceFormulas(result: SchedulingResult): FormulaModel[] {
  const metrics = result.metrics, count = result.processes.length
  const average = (id: string, title: string, symbol: string, field: 'waitingTime' | 'turnaroundTime' | 'responseTime', value: number): FormulaModel => {
    const terms = result.processes.map(process => ({ label: process.id, value: process[field] }))
    const sum = terms.reduce((total, term) => total + term.value, 0)
    return { id, title, formula: `Average ${symbol} = Σ ${symbol} / Number of Processes`, substitution: `Average ${symbol} = (${terms.map(term => term.value).join(' + ') || '0'}) / ${count}`, exact: `Average ${symbol} = ${sum} / ${count}`, value: count ? value : null, unit: 'CPU units', terms, note: 'Integer terms and the exact fraction are retained. Only the displayed quotient is rounded, to at most 4 decimal places.' }
  }
  const busy = result.processes.map(process => ({ label: process.id, value: process.executedTime }))
  const idle = result.segments.filter(segment => segment.isIdle).map(segment => ({ label: `${segment.startTime}–${segment.endTime}`, value: segment.duration }))
  const observed = metrics.totalObservedTime
  return [
    average('average-waiting', 'Average WT', 'WT', 'waitingTime', metrics.averageWaitingTime),
    average('average-turnaround', 'Average TT', 'TT', 'turnaroundTime', metrics.averageTurnaroundTime),
    average('average-response', 'Average RT', 'RT', 'responseTime', metrics.averageResponseTime),
    { id: 'busy', title: 'Total CPU Busy Time', formula: 'Busy Time = Σ recorded CPU execution', substitution: `Busy Time = ${busy.map(term => term.value).join(' + ') || '0'}`, exact: `Busy Time = ${metrics.totalBusyTime}`, value: metrics.totalBusyTime, unit: 'CPU units', terms: busy, note: 'Each term is a process’s recorded executed time. For this CPU-only model it equals BT; the total agrees with all non-idle Gantt intervals.' },
    { id: 'idle', title: 'Total CPU Idle Time', formula: 'Idle Time = Σ IDLE interval durations', substitution: `Idle Time = ${idle.map(term => term.value).join(' + ') || '0 (no IDLE intervals)'}`, exact: `Idle Time = ${metrics.totalIdleTime}`, value: metrics.totalIdleTime, unit: 'CPU units', terms: idle, note: 'Idle time is counted directly from the returned Gantt intervals, including any initial delay before the first arrival.' },
    { id: 'observed', title: 'Total Observed Time', formula: 'Observed Time = Busy Time + Idle Time', substitution: `Observed Time = ${metrics.totalBusyTime} + ${metrics.totalIdleTime}`, exact: `Observed Time = ${observed}`, value: observed, unit: 'CPU units', note: `Observation window: ${metrics.observationStartTime}–${metrics.observationEndTime}. Idle time is part of this shared window.` },
    { id: 'utilization', title: 'CPU Utilization Calculation', formula: 'CPU Utilization = (Busy Time / Observed Time) × 100', substitution: `CPU Utilization = (${metrics.totalBusyTime} / ${observed}) × 100`, exact: `CPU Utilization = (${metrics.totalBusyTime} / ${observed}) × 100`, value: observed > 0 ? metrics.cpuUtilization : null, unit: '%', note: 'Idle periods reduce CPU utilization. This is a whole-timeline ratio, never an average of per-process percentages.' },
    { id: 'throughput', title: 'Throughput Calculation', formula: 'Throughput = Completed Processes / Observed Time', substitution: `Throughput = ${metrics.completedProcesses} / ${observed}`, exact: `Throughput = ${metrics.completedProcesses} / ${observed}`, value: observed > 0 ? metrics.throughput : null, unit: 'processes / CPU unit', note: 'The numerator counts processes that completed in the same observation window.' },
    { id: 'makespan', title: 'Makespan Calculation', formula: 'Makespan = Final Completion Time − Simulation Origin', substitution: `Makespan = ${metrics.observationEndTime} − ${metrics.observationStartTime}`, exact: `Makespan = ${metrics.observationEndTime - metrics.observationStartTime}`, value: metrics.observationEndTime - metrics.observationStartTime, unit: 'CPU units', note: 'The current engine observes from time 0, so makespan includes initial and intermediate idle periods.' },
  ]
}

export function resultCalculationText(result: SchedulingResult) {
  const write = (formula: FormulaModel) => [formula.title, formula.formula, formula.substitution, formula.exact, formulaResult(formula), formula.note].join('\n')
  return `${resultTableText(result)}\n\n${result.processes.map(process => `${process.id}\nFirst Start Time = ${process.firstStartTime}\nExecution: ${process.executionHistory.map(segment => `${segment.startTime}–${segment.endTime}${segment.queueLevel ? ` (Q${segment.queueLevel})` : ''}`).join(', ')}\n${processFormulas(process).map(write).join('\n\n')}`).join('\n\n')}\n\nMISSION PERFORMANCE SUMMARY\n${performanceFormulas(result).map(write).join('\n\n')}`
}
