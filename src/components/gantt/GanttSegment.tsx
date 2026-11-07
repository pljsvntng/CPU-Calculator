import { CrewAvatar } from '../CrewAvatar'
import { GANTT_Y } from '../../utils/ganttScale'
import { processColor, processColorIndex } from '../../utils/simulationView'
import type { SegmentDetails } from '../../utils/simulationView'

export const GanttSegment = memo(function GanttSegment({ segment, x, width, active, selected, processSelected = false, onInspect, onMove }: {
  segment: SegmentDetails; x: number; width: number; active: boolean; selected: boolean
  processSelected?: boolean
  onInspect: (index: number) => void; onMove: (index: number, focus?: boolean) => void
}) {
  const label = `${segment.processId ?? 'IDLE'} · ${segment.startTime}–${segment.endTime} · duration ${segment.duration}`
  return <g role="button" tabIndex={0} className={`gantt-segment ${active ? 'active-segment' : ''} ${selected ? 'selected-segment' : ''} ${processSelected ? 'process-selected-segment' : ''}`}
    aria-label={label} aria-pressed={selected} data-gantt-segment={segment.index} data-process={segment.processId ?? 'IDLE'} data-start={segment.startTime} data-end={segment.endTime}
    onPointerMove={event => { if (event.pointerType !== 'touch') onInspect(segment.index) }} onFocus={() => onInspect(segment.index)} onClick={() => onInspect(segment.index)}
    onKeyDown={event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onInspect(segment.index) }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); onMove(segment.index + (event.key === 'ArrowRight' ? 1 : -1), true) }
    }}>
    <title>{label}. {segment.isIdle ? 'No process ready.' : `Remaining after interval: ${segment.remainingAfter}.${segment.queueLevel ? ` Queue ${segment.queueLevel}.` : ''}`} Focus or tap to inspect.</title>
    <rect className="segment-block" x={x} y={GANTT_Y} width={width} height={70} fill={segment.isIdle ? '#68758a' : processColor(segment.processId!).value} stroke="#0b1220" strokeWidth={1} />
    {segment.isIdle && <rect x={x} y={GANTT_Y} width={width} height={70} fill="url(#gantt-idle-pattern)" pointerEvents="none" />}
    {width >= 36 && <g pointerEvents="none"><rect x={x + width / 2 - Math.min(33, width / 2 - 3)} y={GANTT_Y + 23} width={Math.min(66, width - 6)} height={24} rx={3} fill="#f8fafc" />
      <text x={x + width / 2} y={GANTT_Y + 39} textAnchor="middle" fontFamily="monospace" fontSize={12} fontWeight={700} fill="#0f172a">{segment.processId ?? 'IDLE'}</text></g>}
    {width >= 116 && segment.processId && <g transform={`translate(${x + 11},${GANTT_Y + 19})`} pointerEvents="none"><CrewAvatar processId={processColorIndex(segment.processId)} size={26} /></g>}
    {(active || selected || processSelected) && <rect className="segment-outline" x={x} y={GANTT_Y - 4} width={width} height={78} fill="none" stroke={active ? '#facc15' : selected ? '#f8fafc' : '#67e8f9'} strokeWidth={active ? 3 : 2} pointerEvents="none" />}
  </g>
})
import { memo } from 'react'
