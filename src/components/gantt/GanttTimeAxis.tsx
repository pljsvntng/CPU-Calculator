import { memo, useMemo } from 'react'
import { GANTT_Y, visibleTimeLabels } from '../../utils/ganttScale'
export const GanttTimeAxis = memo(function GanttTimeAxis({ times, x, visibleFrom, visibleTo }: {
  times: number[]; x: (time: number) => number; visibleFrom: number; visibleTo: number
}) {
  const visible = useMemo(() => visibleTimeLabels(times, x), [times, x])
  return <g className="gantt-axis" aria-label="Time axis">
    {times.filter(time => x(time) >= visibleFrom - 100 && x(time) <= visibleTo + 100).map(time => <g key={time} data-time-marker={time}>
      <title>Time {time}</title><line x1={x(time)} x2={x(time)} y1={GANTT_Y + 74} y2={GANTT_Y + 83} stroke="#bcc9db" />
      {visible.has(time) && <text x={x(time)} y={GANTT_Y + 104} textAnchor="middle" fill="#e2e8f0" fontFamily="monospace" fontSize={12}>{time}</text>}
    </g>)}
  </g>
})
