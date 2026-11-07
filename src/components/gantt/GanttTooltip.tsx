import type { SegmentDetails } from '../../utils/simulationView'
import { CrewmateProcessIcon } from './CrewmateProcessIcon'
export function GanttTooltip({ segment }: { segment?: SegmentDetails }) {
  return <section className="gantt-inspector" aria-label="Interval details" aria-live="polite">
    <div><span className="eyebrow">INTERVAL INSPECTOR</span>{segment ? <h3>{segment.processId ? <CrewmateProcessIcon id={segment.processId} /> : 'CPU IDLE'}<span className="mono">#{segment.index + 1}</span></h3> : <p>Hover, focus or tap an interval to inspect its real timings.</p>}</div>
    {segment && <><dl>{[
      ['Start Time', segment.startTime], ['End Time', segment.endTime], ['Duration', segment.duration],
      ...(segment.process ? [['Arrival Time', segment.process.arrivalTime], ['Original Burst Time', segment.process.burstTime], ['Remaining After Interval', segment.remainingAfter]] : []),
      ...(segment.queueLevel === undefined ? [] : [['Queue Level', segment.queueLevel]]),
    ].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd className="mono">{value}</dd></div>)}</dl>{segment.isIdle && <p>No process is ready during this interval.</p>}</>}
  </section>
}
