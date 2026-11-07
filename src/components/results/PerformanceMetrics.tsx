import type { SchedulingResult } from '../../types/scheduling'
import { displayNumber } from '../../utils/formatting'
export const PerformanceMetrics = memo(function PerformanceMetrics({ result }: { result: SchedulingResult }) {
  const m = result.metrics
  return <><dl className="report-metrics">{[
    ['Number of Processes', result.processes.length, ''], ['Total Burst Time', m.totalBusyTime, 'CPU units'],
    ['Average Waiting Time', m.averageWaitingTime, 'CPU units'], ['Average Turnaround Time', m.averageTurnaroundTime, 'CPU units'],
    ['Average Response Time', m.averageResponseTime, 'CPU units'], ['CPU Utilization', m.totalObservedTime > 0 ? m.cpuUtilization : null, '%'],
    ['Throughput', m.totalObservedTime > 0 ? m.throughput : null, 'processes / CPU unit'], ['Total Busy Time', m.totalBusyTime, 'CPU units'],
    ['Total Idle Time', m.totalIdleTime, 'CPU units'], ['Makespan', m.observationEndTime - m.observationStartTime, 'CPU units'],
  ].map(([label, value, unit]) => <div key={String(label)}><dt>{label}</dt><dd className="mono" title={`Unrounded value: ${value === null ? 'undefined (zero observation window)' : String(value)}${unit === '%' ? '%' : ''}`}>{value === null ? 'Undefined' : `${displayNumber(Number(value))}${unit === '%' ? '%' : ''}`}</dd>{unit && unit !== '%' && <span className="metric-unit">{unit}</span>}</div>)}</dl>
    <p className="report-precision">ET = execution/completion time (CT). TT = turnaround time (TAT). All times use one CPU unit. Only displayed averages, percentages and rates are rounded, to at most 4 decimal places; stored results retain full precision.</p></>
})
import { memo } from 'react'
