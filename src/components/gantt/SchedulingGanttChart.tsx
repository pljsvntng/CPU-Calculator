import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChartNoAxesGantt, ChevronLeft, ChevronRight } from 'lucide-react'
import type { SchedulingResult } from '../../types/scheduling'
import { algorithms } from '../../data/algorithms'
import { EmptyState, Panel } from '../ui'
import { ganttScale, ganttWidth, GANTT_HEIGHT, GANTT_Y } from '../../utils/ganttScale'
import { simulationView, processColor } from '../../utils/simulationView'
import { unitTimeline, unitWindow, UNIT_WINDOW_SIZE } from '../../utils/ganttUnits'
import { exportGantt } from '../../utils/ganttExport'
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback'
import type { SimulationPlayback } from '../../hooks/useSimulationPlayback'
import { useSimulationSession } from '../../hooks/useSimulationSession'
import { GanttSegment } from './GanttSegment'
import { GanttTimeAxis } from './GanttTimeAxis'
import { GanttTooltip } from './GanttTooltip'
import { GanttControls } from './GanttControls'
import { GanttPlayback } from './GanttPlayback'
import { QueueTimelines } from './QueueTimelines'
import { MissionStatus } from './MissionStatus'

export function SchedulingGanttChart({ result, outdated = false }: { result: SchedulingResult | null; outdated?: boolean }) {
  const [session, setSession] = useState({ result, key: 0 })
  const shared = useSimulationSession()
  if (session.result !== result) setSession({ result, key: session.key + 1 })
  if (!result) return <Panel title="CPU EXECUTION TIMELINE" caption="Track your crewmates as they complete their CPU missions." className="gantt-empty"><EmptyState icon={ChartNoAxesGantt} title="No calculated timeline" description="Run a valid simulation to view its real execution intervals, idle time, event snapshots and playback." /></Panel>
  return shared ? <TimelineWorkspace key={session.key} result={result} outdated={outdated} playback={shared} selectedProcessId={shared.selectedProcessId} /> : <StandaloneTimeline key={session.key} result={result} outdated={outdated} />
}

function StandaloneTimeline({ result, outdated }: { result: SchedulingResult; outdated: boolean }) {
  const playback = useSimulationPlayback(result, outdated)
  return <TimelineWorkspace result={result} outdated={outdated} playback={playback} />
}

function TimelineWorkspace({ result, outdated, playback, selectedProcessId }: { result: SchedulingResult; outdated: boolean; playback: SimulationPlayback; selectedProcessId?: string | null }) {
  const root = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const fullscreenButton = useRef<HTMLElement | null>(null)
  const pendingScroll = useRef<number | null>(null)
  const focusInterval = useRef<number | null>(null)
  const [available, setAvailable] = useState(800)
  const [viewport, setViewport] = useState({ page: 0, time: playback.time, left: 0 })
  const [zoom, setZoom] = useState(1)
  const [fit, setFit] = useState(false)
  const [selected, setSelected] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState('')
  const [exportError, setExportError] = useState('')
  const timeline = useMemo(() => unitTimeline(result), [result])
  const playbackPage = Math.max(0, Math.floor(timeline.indexAtTime(playback.time) / UNIT_WINDOW_SIZE))
  const following = viewport.time !== playback.time && viewport.page !== playbackPage
  const page = following ? playbackPage : viewport.page
  const scrollLeft = following ? 0 : viewport.left
  const setScrollLeft = useCallback((left: number) => setViewport({ page, time: playback.time, left }), [page, playback.time])
  const minimumUnitWidth = Math.max(56, String(result.metrics.observationEndTime).length * 8 + 16, ...result.processes.map(p => p.id.length * 8 + 20))
  const bounds = useMemo(() => unitWindow(timeline, page), [timeline, page])
  const width = ganttWidth(bounds.endTime - bounds.startTime, available, zoom, fit, timeline.count, minimumUnitWidth)
  const scale = useMemo(() => ganttScale(bounds.startTime, bounds.endTime, width), [bounds, width])
  const view = simulationView(result, playback.time, playback.eventIndex)
  const visible = useMemo(() => {
    const startTime = bounds.startTime + (scrollLeft - 100 - scale.left) / scale.pixelsPerUnit
    const endTime = bounds.startTime + (scrollLeft + available + 100 - scale.left) / scale.pixelsPerUnit
    return timeline.slice(Math.max(bounds.first, timeline.indexAtTime(startTime)), Math.min(bounds.last, timeline.indexAtTime(endTime) + 2))
  }, [timeline, bounds, scrollLeft, available, scale])
  useLayoutEffect(() => {
    if (following && scroller.current) scroller.current.scrollLeft = 0
  }, [following, page])
  const times = useMemo(() => [...new Set(visible.flatMap(segment => [segment.startTime, segment.endTime]))], [visible])
  useLayoutEffect(() => {
    const element = scroller.current!
    const resize = () => setAvailable(element.clientWidth || 800)
    resize()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const onFullscreen = () => setExpanded(document.fullscreenElement === root.current)
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => document.removeEventListener('fullscreenchange', onFullscreen)
  }, [])
  useEffect(() => {
    if (!expanded) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root.current?.querySelector<HTMLButtonElement>('.gantt-controls button[aria-label="Zoom Out"]')?.focus()
    return () => { document.body.style.overflow = overflow; fullscreenButton.current?.focus() }
  }, [expanded])
  const closeFullscreen = async () => {
    if (document.fullscreenElement === root.current) await document.exitFullscreen()
    setExpanded(false)
  }
  const fullscreen = async () => {
    if (expanded) { await closeFullscreen(); return }
    fullscreenButton.current = document.activeElement as HTMLElement
    setExpanded(true)
    try {
      if (!root.current?.requestFullscreen) throw new Error('unsupported')
      await root.current.requestFullscreen()
    } catch { setMessage('Expanded view is active. Browser fullscreen is unavailable; press Escape or Exit Fullscreen to return.') }
  }
  const inspect = useCallback((index: number) => setSelected(index), [])
  const move = useCallback((index: number, focus = false) => {
    const bounded = Math.max(0, Math.min(timeline.count - 1, index))
    if (focus) focusInterval.current = bounded
    const nextPage = Math.floor(bounded / UNIT_WINDOW_SIZE), nextBounds = unitWindow(timeline, nextPage)
    const nextWidth = ganttWidth(nextBounds.endTime - nextBounds.startTime, available, zoom, fit, timeline.count, minimumUnitWidth)
    const nextScale = ganttScale(nextBounds.startTime, nextBounds.endTime, nextWidth)
    setSelected(bounded)
    const position = Math.max(0, Math.min(nextWidth - available, nextScale.x(timeline.at(bounded)!.startTime) - available / 3))
    pendingScroll.current = position
    setViewport({ page: nextPage, time: playback.time, left: position })
  }, [timeline, available, zoom, fit, minimumUnitWidth, playback.time])
  useLayoutEffect(() => {
    if (pendingScroll.current !== null && scroller.current) {
      scroller.current.scrollLeft = pendingScroll.current
      pendingScroll.current = null
    }
    if (focusInterval.current === null) return
    root.current?.querySelector<SVGElement>(`[data-gantt-segment="${focusInterval.current}"]`)?.focus()
    focusInterval.current = null
  }, [selected, visible])
  const exportImage = async (type: 'svg' | 'png') => {
    if (outdated) return
    setExporting(true); setMessage(''); setExportError('')
    try { await exportGantt(result, type, Math.max(1000, width)); setMessage(`${type.toUpperCase()} exported with the full schedule. Unit blocks wrap into rows in wide exports; no execution units are merged.`) }
    catch (error) { setExportError(error instanceof Error ? error.message : 'Chart export failed. Please retry.') }
    finally { setExporting(false) }
  }
  return <div ref={root} className={`gantt-workspace ${expanded ? 'gantt-expanded' : ''}`} role={expanded ? 'dialog' : undefined} aria-modal={expanded || undefined} aria-label={expanded ? 'Expanded CPU execution timeline' : undefined}
    onKeyDown={event => {
      if (expanded && event.key === 'Escape') { event.preventDefault(); void closeFullscreen() }
      if (expanded && event.key === 'Tab') {
        const focusable = [...root.current!.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]')]
        const first = focusable[0], last = focusable.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }}>
    <Panel title="CPU EXECUTION TIMELINE" caption="Each execution or idle block shows at most one CPU time unit." action={<span className={`badge ${outdated ? 'upcoming' : 'verified-badge'}`}>{outdated ? 'OUTDATED TIMELINE' : 'ENGINE TIMELINE'}</span>}>
      {outdated && <div className="stale-report-note" role="status" aria-label="Outdated timeline"><strong>Previous calculation — inputs or settings have changed.</strong><p>Playback and export are stopped. Recalculate to visualize the current draft.</p></div>}
      <GanttControls zoom={zoom} fit={fit} expanded={expanded} exporting={exporting} disabled={outdated}
        onZoom={factor => setZoom(previous => Math.min(16, Math.max(0.25, previous * factor)))} onReset={() => { setFit(false); setZoom(1) }} onFit={() => { setFit(true); setZoom(1); if (scroller.current) scroller.current.scrollLeft = 0; setScrollLeft(0) }} onFullscreen={() => void fullscreen()} onExport={type => void exportImage(type)} />
      <div className="timeline-meta"><div><strong>{result.algorithm}</strong><span>{algorithms.find(a => a.id === result.algorithm)?.name}</span></div><span className="mono">0–{result.metrics.observationEndTime} CPU UNITS · {timeline.count} UNIT BLOCKS · {result.segments.length} SCHEDULING INTERVALS{fit && width > available ? ' · SCROLL TO EXPLORE' : ''}</span></div>
      {result.algorithm === 'MLFQ' && <p className="queue-chart-guide">One CPU, one clock. The combined timeline is authoritative. The queue charts below share its scale, playhead, and horizontal scroll. Muted blocks mean another queue is running; IDLE means no process is ready. Tap a colored block for details.</p>}
      {timeline.count > UNIT_WINDOW_SIZE && <div className="gantt-unit-window" role="group" aria-label="Timeline time window"><button type="button" className="button secondary small" disabled={page === 0} onClick={() => move((page - 1) * UNIT_WINDOW_SIZE)}>Previous window</button><span role="status">Time {bounds.startTime}–{bounds.endTime} of 0–{result.metrics.observationEndTime}. Window {page + 1} / {Math.ceil(timeline.count / UNIT_WINDOW_SIZE)}. All {timeline.count.toLocaleString()} unit blocks are available.</span><button type="button" className="button secondary small" disabled={bounds.last === timeline.count} onClick={() => move(bounds.last)}>Next window</button></div>}
      <div className="gantt-scroll" ref={scroller} tabIndex={0} role="region" aria-label="Execution timeline, scroll horizontally to explore" onScroll={event => setScrollLeft(event.currentTarget.scrollLeft)}>
        <svg className="scheduling-gantt-svg" width={width} height={GANTT_HEIGHT} viewBox={`0 0 ${width} ${GANTT_HEIGHT}`} role="group" aria-label={`${result.algorithm} Gantt chart`}>
          <title>{result.algorithm} CPU execution timeline</title><desc>Separate time-unit blocks from time {bounds.startTime} to {bounds.endTime} on the unchanged CPU timeline. Focus or tap a block to inspect it. Use the unit navigator to reach every block in long schedules.</desc>
          <defs><pattern id="gantt-idle-pattern" width={8} height={8} patternUnits="userSpaceOnUse"><path d="M-2 2L2-2M0 8L8 0M6 10L10 6" stroke="#cbd5e1" strokeWidth={1} opacity={0.25} /></pattern></defs>
          <rect width={width} height={GANTT_HEIGHT} fill="#101827" />
          <text x={scrollLeft + 20} y={30} fill="#bcc9db" fontFamily="monospace" fontSize={11}>CPU / {outdated ? 'PREVIOUS RESULT' : playback.playing ? 'PLAYING' : 'INSPECTION'} · ONE SHARED TIME SCALE</text>
          {visible.map(segment => <GanttSegment key={segment.index} segment={segment} x={scale.x(segment.startTime)} width={scale.durationWidth(segment.duration)} active={view.activeIndex === segment.sourceIndex && playback.time >= segment.startTime && playback.time < segment.endTime} selected={selected === segment.index} processSelected={!!selectedProcessId && segment.processId === selectedProcessId} onInspect={inspect} onMove={move} />)}
          <GanttTimeAxis times={times} x={scale.x} visibleFrom={scrollLeft} visibleTo={scrollLeft + available} />
          <g aria-label={`Playhead at ${playback.time}`} pointerEvents="none"><line x1={scale.x(playback.time)} x2={scale.x(playback.time)} y1={GANTT_Y - 20} y2={GANTT_Y + 78} stroke="#facc15" strokeWidth={2} /><path d={`M${scale.x(playback.time) - 5} ${GANTT_Y - 23}h10l-5 8Z`} fill="#facc15" /></g>
          <text x={scrollLeft + 20} y={215} fill="#bcc9db" fontFamily="monospace" fontSize={10}>TIME / CPU units · one block per time unit · swipe to explore</text>
        </svg>
        <QueueTimelines result={result} visible={visible} width={width} x={scale.x} times={times} scrollLeft={scrollLeft} available={available} time={playback.time} selected={selected} onInspect={inspect} />
      </div>
      <div className="timeline-legend" aria-label="Process color legend">{result.processes.map(process => <span key={process.id}><i style={{ background: processColor(process.id).value }} /><strong className="mono">{process.id}</strong></span>)}{result.metrics.totalIdleTime > 0 && <span><i style={{ background: '#68758a' }} />IDLE</span>}</div>
      {selectedProcessId !== undefined && <p className="selected-crew-note">Cyan outline: {selectedProcessId ? `selected crewmate ${selectedProcessId}` : 'no crewmate selected'} · yellow: active CPU interval · white: interval inspector.</p>}
      <div className="interval-navigation"><button className="icon-button" type="button" aria-label="Previous interval" disabled={selected <= 0} onClick={() => move(selected - 1)}><ChevronLeft size={17} /></button><label>Inspect interval <input aria-label="Inspect interval" type="number" min={1} max={timeline.count} step={1} value={selected + 1} onChange={event => { const index = event.currentTarget.valueAsNumber - 1; if (Number.isInteger(index) && index >= 0 && index < timeline.count) move(index) }} /><span className="mono">/ {timeline.count}</span></label><button className="icon-button" type="button" aria-label="Next interval" disabled={selected >= timeline.count - 1} onClick={() => move(selected + 1)}><ChevronRight size={17} /></button><p>Unit borders show time, not new dispatches. Jump to any block with this navigator. Fit preserves readable cells; scroll to explore.</p></div>
      <GanttTooltip segment={timeline.at(selected)} />
      <GanttPlayback playback={playback} end={result.metrics.observationEndTime} eventCount={result.events.length} disabled={outdated} />
      <MissionStatus result={result} playback={playback} outdated={outdated} />
      {message && <p className="gantt-feedback" role="status">{message}</p>}{exportError && <p className="gantt-feedback error-note" role="alert">{exportError}</p>}
    </Panel>
  </div>
}
