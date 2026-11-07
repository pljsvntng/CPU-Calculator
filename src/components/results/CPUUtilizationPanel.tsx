import type { SchedulingResult } from '../../types/scheduling'
import { Panel } from '../ui'
import { displayNumber } from '../../utils/formatting'
export const CPUUtilizationPanel = memo(function CPUUtilizationPanel({ result }: { result: SchedulingResult }) {
  const metrics = result.metrics, observed = metrics.totalObservedTime
  return <Panel title="CPU UTILIZATION EXPLANATION" caption="One shared observation window, including every idle interval."><div className="utilization-explanation"><dl>{[['Recorded Busy Time', metrics.totalBusyTime], ['Recorded Idle Time', metrics.totalIdleTime], ['Observed Window Duration', observed]].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd className="mono">{value} CPU units</dd></div>)}</dl>
    <p className="mono">CPU Utilization = (Total CPU Busy Time / Total Observed Time) × 100</p><p className="mono">CPU Utilization = ({metrics.totalBusyTime} / {observed}) × 100</p><p className="utilization-answer mono">{observed > 0 ? `${displayNumber(metrics.cpuUtilization)}%` : 'Undefined — zero observation duration'}</p>
    <p>Idle periods use observation time without doing CPU work, so they reduce utilization. This value agrees with the busy and idle Gantt intervals; it is never an average of individual process percentages.</p>{observed <= 0 && <p>No percentage or throughput can be defined for a zero-duration observation window. A valid CPU-only workload requires positive burst times.</p>}
  </div></Panel>
})
import { memo } from 'react'
