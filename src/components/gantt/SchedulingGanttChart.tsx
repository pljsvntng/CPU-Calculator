import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChartNoAxesGantt, ChevronLeft, ChevronRight } from 'lucide-react'
import type { SchedulingResult } from '../../types/scheduling'
import { algorithms } from '../../data/algorithms'
import { EmptyState, Panel } from '../ui'
import { ganttScale, ganttWidth, GANTT_HEIGHT, GANTT_Y, lastIndexAtOrBefore } from '../../utils/ganttScale'
import { segmentDetails, simulationView, processColor } from '../../utils/simulationView'
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
  const focusInterval = useRef<number | null>(null)
  const [available, setAvailable] = useState(800)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [fit, setFit] = useState(false)
  const [selected, setSelected] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState('')
  const [exportError, setExportError] = useState('')
  const details = useMemo(() => segmentDetails(result), [result])
  const times = useMemo(() => [...new Set(result.segments.flatMap(segment => [segment.startTime, segment.endTime]))], [result])
  const width = ganttWidth(result.metrics.totalObservedTime, available, zoom, fit, details.length)
  const scale = useMemo(() => ganttScale(result.metrics.observationStartTime, result.metrics.observationEndTime, width), [result, width])
  const view = simulationView(result, playback.time, playback.eventIndex)
  const visible = useMemo(() => {
    const startTime = result.metrics.observationStartTime + (scrollLeft - 100 - scale.left) / scale.pixelsPerUnit
    const endTime = result.metrics.observationStartTime + (scrollLeft + available + 100 - scale.left) / scale.pixelsPerUnit
    const start = Math.max(0, lastIndexAtOrBefore(details, startTime, item => item.startTime))
    const end = Math.min(details.length, lastIndexAtOrBefore(details, endTime, item => item.startTime) + 2)
    return details.slice(start, end)
  }, [details, result, scrollLeft, available, scale])
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
    const bounded = Math.max(0, Math.min(details.length - 1, index))
    if (focus) focusInterval.current = bounded
    setSelected(bounded)
    const position = Math.max(0, Math.min(width - available, scale.x(details[bounded].startTime) - available / 3))
    if (scroller.current) scroller.current.scrollLeft = position
    setScrollLeft(position)
  }, [details, scale, width, available])
  useLayoutEffect(() => {
    if (focusInterval.current === null) return
    root.current?.querySelector<SVGElement>(`[data-gantt-segment="${focusInterval.current}"]`)?.focus()
    focusInterval.current = null
  }, [selected, visible])
  const exportImage = async (type: 'svg' | 'png') => {
    if (outdated) return
    setExporting(true); setMessage(''); setExportError('')
    try { await exportGantt(result, type, Math.max(1000, width)); setMessage(`${type.toUpperCase()} exported with the full schedule. Exports use a bounded width of up to 16,000 pixels.`) }
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
    <Panel title="CPU EXECUTION TIMELINE" caption="Track your crewmates as they complete their CPU missions." action={<span className={`badge ${outdated ? 'upcoming' : 'verified-badge'}`}>{outdated ? 'OUTDATED TIMELINE' : 'ENGINE TIMELINE'}</span>}>
      {outdated && <div className="stale-report-note" role="status" aria-label="Outdated timeline"><strong>Previous calculation — inputs or settings have changed.</strong><p>Playback and export are stopped. Recalculate to visualize the current draft.</p></div>}
      <GanttControls zoom={zoom} fit={fit} expanded={expanded} exporting={exporting} disabled={outdated}
        onZoom={factor => setZoom(previous => Math.min(16, Math.max(0.25, previous * factor)))} onReset={() => { setFit(false); setZoom(1) }} onFit={() => { setFit(true); setZoom(1); if (scroller.current) scroller.current.scrollLeft = 0; setScrollLeft(0) }} onFullscreen={() => void fullscreen()} onExport={type => void exportImage(type)} />
      <div className="timeline-meta"><div><strong>{result.algorithm}</strong><span>{algorithms.find(a => a.id === result.algorithm)?.name}</span></div><span className="mono">0–{result.metrics.observationEndTime} CPU UNITS · {details.length} INTERVALS{fit && width > available ? ' · SCROLL TO EXPLORE' : ''}</span></div>
      {result.algorithm === 'MLFQ' && <p className="queue-chart-guide">One CPU, one clock. The combined timeline is authoritative. The queue charts below share its scale, playhead, and horizontal scroll. Muted blocks mean another queue is running; IDLE means no process is ready. Tap a colored block for details.</p>}
      <div className="gantt-scroll" ref={scroller} tabIndex={0} role="region" aria-label="Execution timeline, scroll horizontally to explore" onScroll={event => setScrollLeft(event.currentTarget.scrollLeft)}>
        <svg className="scheduling-gantt-svg" width={width} height={GANTT_HEIGHT} viewBox={`0 0 ${width} ${GANTT_HEIGHT}`} role="group" aria-label={`${result.algorithm} Gantt chart`}>
          <title>{result.algorithm} CPU execution timeline</title><desc>Proportional intervals from time 0 to {result.metrics.observationEndTime}. Focus or tap a block to inspect it. Narrow intervals can also be selected with the interval navigator.</desc>
          <defs><pattern id="gantt-idle-pattern" width={8} height={8} patternUnits="userSpaceOnUse"><path d="M-2 2L2-2M0 8L8 0M6 10L10 6" stroke="#cbd5e1" strokeWidth={1} opacity={0.25} /></pattern></defs>
          <rect width={width} height={GANTT_HEIGHT} fill="#101827" />
          <text x={scrollLeft + 20} y={30} fill="#bcc9db" fontFamily="monospace" fontSize={11}>CPU / {outdated ? 'PREVIOUS RESULT' : playback.playing ? 'PLAYING' : 'INSPECTION'} · ONE SHARED TIME SCALE</text>
          {visible.map(segment => <GanttSegment key={segment.index} segment={segment} x={scale.x(segment.startTime)} width={scale.durationWidth(segment.duration)} active={view.activeIndex === segment.index} selected={selected === segment.index} processSelected={!!selectedProcessId && segment.processId === selectedProcessId} onInspect={inspect} onMove={move} />)}
          <GanttTimeAxis times={times} x={scale.x} visibleFrom={scrollLeft} visibleTo={scrollLeft + available} />
          <g aria-label={`Playhead at ${playback.time}`} pointerEvents="none"><line x1={scale.x(playback.time)} x2={scale.x(playback.time)} y1={GANTT_Y - 20} y2={GANTT_Y + 78} stroke="#facc15" strokeWidth={2} /><path d={`M${scale.x(playback.time) - 5} ${GANTT_Y - 23}h10l-5 8Z`} fill="#facc15" /></g>
          <text x={scrollLeft + 20} y={215} fill="#bcc9db" fontFamily="monospace" fontSize={10}>TIME / CPU units · narrow labels available in interval inspector</text>
        </svg>
        <QueueTimelines result={result} visible={visible} width={width} x={scale.x} times={times} scrollLeft={scrollLeft} available={available} time={playback.time} selected={selected} onInspect={inspect} />
      </div>
      <div className="timeline-legend" aria-label="Process color legend">{result.processes.map(process => <span key={process.id}><i style={{ background: processColor(process.id).value }} /><strong className="mono">{process.id}</strong></span>)}{result.metrics.totalIdleTime > 0 && <span><i style={{ background: '#68758a' }} />IDLE</span>}</div>
      {selectedProcessId !== undefined && <p className="selected-crew-note">Cyan outline: {selectedProcessId ? `selected crewmate ${selectedProcessId}` : 'no crewmate selected'} · yellow: active CPU interval · white: interval inspector.</p>}
      <div className="interval-navigation"><button className="icon-button" type="button" aria-label="Previous interval" disabled={selected <= 0} onClick={() => move(selected - 1)}><ChevronLeft size={17} /></button><label>Inspect interval <input aria-label="Inspect interval" type="number" min={1} max={details.length} step={1} value={selected + 1} onChange={event => { const index = event.currentTarget.valueAsNumber - 1; if (Number.isInteger(index) && index >= 0 && index < details.length) move(index) }} /><span className="mono">/ {details.length}</span></label><button className="icon-button" type="button" aria-label="Next interval" disabled={selected >= details.length - 1} onClick={() => move(selected + 1)}><ChevronRight size={17} /></button><p>Narrow blocks keep their true width. Inspect any interval here or zoom in.</p></div>
      <GanttTooltip segment={details[selected]} />
      <GanttPlayback playback={playback} end={result.metrics.observationEndTime} eventCount={result.events.length} disabled={outdated} />
      <MissionStatus result={result} playback={playback} outdated={outdated} />
      {message && <p className="gantt-feedback" role="status">{message}</p>}{exportError && <p className="gantt-feedback error-note" role="alert">{exportError}</p>}
    </Panel>
  </div>
}
