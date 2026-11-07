import type { SchedulingResult } from '../types/scheduling'
import type { SchedulingRequest } from './calculator'
import { comparisonMetrics } from './comparisonEngine'
export function csv(rows: unknown[][]) {
  return rows.map(row => row.map(value => { let text = String(value ?? ''); if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"` }).join(',')).join('\r\n')
}
export const inputCsv = (r: SchedulingRequest) => csv([['Process', 'AT', 'BT', 'Priority', 'Queue'], ...r.processes.map(p => [p.id, p.arrivalTime, p.burstTime, p.priority, p.queueLevel])])
export const resultsCsv = (r: SchedulingResult) => csv([['Algorithm', 'Process', 'AT', 'BT', 'ET/CT', 'TT/TAT', 'WT', 'RT'], ...r.processes.map(p => [r.algorithm, p.id, p.arrivalTime, p.burstTime, p.completionTime, p.turnaroundTime, p.waitingTime, p.responseTime])])
export const comparisonCsv = (results: SchedulingResult[]) => csv([['Algorithm', ...comparisonMetrics.map(m => `${m[1]} (${m[2]})`), 'Busy time', 'Idle time'], ...results.map(r => [r.algorithm, ...comparisonMetrics.map(m => r.metrics[m[0]]), r.metrics.totalBusyTime, r.metrics.totalIdleTime])])
