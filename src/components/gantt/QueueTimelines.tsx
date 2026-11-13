import type { SchedulingResult } from '../../types/scheduling'
import type { SegmentDetails } from '../../utils/simulationView'
import { processColor } from '../../utils/simulationView'
import { demotionDescription } from '../../utils/feedbackRules'
import { GanttTimeAxis } from './GanttTimeAxis'

/** Synchronized projections of the CPU history, never independently scheduled. */
export function QueueTimelines({ result, visible, width, x, times, scrollLeft, available, time, selected, onInspect }: {
  result: SchedulingResult; visible: SegmentDetails[]; width: number; x: (time: number) => number; times: number[]
  scrollLeft: number; available: number; time: number; selected: number; onInspect: (index: number) => void
}) {
  if (result.config.algorithm !== 'MLFQ') return null
  const levels = result.config.levels
  return <div className="queue-timelines" style={{ width }}>
    {levels.map(queue => <section key={queue.level} className="queue-timeline" aria-label={`Queue ${queue.level} execution timeline`}>
      <div className="queue-timeline-heading" style={{ width: available, left: scrollLeft }}><h3>Queue {queue.level} <span>{queue.level === 1 ? 'Highest priority' : queue.level === levels.length ? 'Lowest priority' : 'Medium priority'}</span></h3><p><strong>{queue.policy.algorithm}{queue.policy.algorithm === 'RR' ? ` · quantum ${queue.policy.quantum}` : ''}</strong> · {demotionDescription(queue)}{queue.level === levels.length ? ' (requeue at final level)' : ''}</p></div>
      <svg width={width} height={195} role="group" aria-label={`Queue ${queue.level} Gantt chart`}>
        <title>Queue {queue.level}: {queue.policy.algorithm}, shared time 0 to {result.metrics.observationEndTime}</title>
        <desc>Colored blocks show this queue executing. Muted blocks mean the CPU executes another queue; IDLE means the whole CPU is idle. Tap a colored interval to inspect exact timestamps below the charts.</desc>
        <rect width={width} height={195} fill="#101827" />
        {visible.map(segment => {
          const active = segment.queueLevel === queue.level && !segment.isIdle
          const label = active ? `${segment.processId} · Q${queue.level}: ${segment.startTime}–${segment.endTime}, duration ${segment.duration}` : segment.isIdle ? `CPU idle: ${segment.startTime}–${segment.endTime}` : `Queue inactive: CPU executes ${segment.processId} in Q${segment.queueLevel} from ${segment.startTime} to ${segment.endTime}`
          const left = x(segment.startTime), blockWidth = x(segment.endTime) - left
          return <g key={segment.index} data-queue-interval={active ? queue.level : undefined} data-process={active ? segment.processId : undefined} data-start={segment.startTime} data-end={segment.endTime} aria-label={label} role={active ? 'button' : undefined} tabIndex={active ? 0 : undefined} onClick={active ? () => onInspect(segment.index) : undefined} onKeyDown={active ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onInspect(segment.index) } } : undefined} className={active ? 'queue-execution-block' : ''}>
            <title>{label}</title><rect x={left} y={62} width={Math.max(0, blockWidth)} height={62} fill={active ? processColor(segment.processId!).value : '#1e293b'} stroke={active && selected === segment.index ? '#fff' : '#475569'} strokeWidth={active && selected === segment.index ? 3 : 1} />
            {active && blockWidth > 38 && <rect x={left + blockWidth / 2 - 17} y={80} width={34} height={26} rx={3} fill="#f8fafc" />}
            {blockWidth > 38 && <text x={left + blockWidth / 2} y={98} textAnchor="middle" fill={active ? '#101827' : '#a4b1c5'} fontSize={12} fontFamily="monospace">{active ? segment.processId : segment.isIdle ? 'IDLE' : blockWidth > 110 ? 'INACTIVE' : '—'}</text>}
          </g>
        })}
        <GanttTimeAxis times={times} x={x} visibleFrom={scrollLeft} visibleTo={scrollLeft + available} />
        <line x1={x(time)} x2={x(time)} y1={50} y2={145} stroke="#facc15" strokeWidth={2} pointerEvents="none" />
      </svg>
    </section>)}
  </div>
}
