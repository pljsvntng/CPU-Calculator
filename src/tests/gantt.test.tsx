import { unitTimeline } from '../utils/ganttUnits'
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SchedulingGanttChart } from '../components/gantt/SchedulingGanttChart'
import { schedule } from '../engine/scheduler'
import { useSimulationPlayback } from '../hooks/useSimulationPlayback'
import { ganttScale, ganttWidth, visibleTimeLabels } from '../utils/ganttScale'
import { segmentDetails, simulationView, processColor } from '../utils/simulationView'
import { buildGanttSvg, ganttPng, downloadBlob } from '../utils/ganttExport'
import * as exports from '../utils/ganttExport'
import { lectureInputExamples } from '../data/lectureExamples'
import { workload } from './fixtures/lectureExamples'

const fcfs = () => schedule(workload([0, 2, 4], [5, 3, 4]), { algorithm: 'FCFS' })
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('engine-driven SVG rendering', () => {
  it.each(['FCFS', 'SJF', 'NPP', 'SRTF', 'PP', 'RR', 'MLQ', 'MLFQ'] as const)('renders every %s time unit with its real timestamps, scale and boundaries', algorithm => {
    const fixture = lectureInputExamples.find(example => example.config.algorithm === algorithm)!
    const result = schedule(fixture.processes, fixture.config)
    const { container } = render(<SchedulingGanttChart result={result} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fit to Screen' }))
    const svg = screen.getByRole('group', { name: `${algorithm} Gantt chart` })
    const scale = ganttScale(0, result.metrics.observationEndTime, Number(svg.getAttribute('width')))
    const segments = container.querySelectorAll('[data-gantt-segment]')
    const units = unitTimeline(result)
    expect(segments.length).toBeLessThanOrEqual(units.count)
    const navigator = screen.getByLabelText('Inspect interval')
    units.slice(0, units.count).forEach((segment, index) => {
      fireEvent.change(navigator, { target: { value: String(index + 1) } })
      const node = container.querySelector(`[data-gantt-segment="${index}"]`)!
      expect(node).toHaveAttribute('data-start', String(segment.startTime))
      expect(node).toHaveAttribute('data-end', String(segment.endTime))
      expect(node).toHaveAttribute('data-process', segment.processId ?? 'IDLE')
      const rect = node.querySelector('.segment-block')!
      expect(Number(rect.getAttribute('x'))).toBeCloseTo(scale.x(segment.startTime))
      expect(Number(rect.getAttribute('width'))).toBeCloseTo(scale.durationWidth(segment.duration))
      const tick = container.querySelector(`[data-time-marker="${segment.endTime}"] line`)!
      expect(Number(tick.getAttribute('x1'))).toBeCloseTo(scale.x(segment.endTime))
    })
  })

  it('gives FCFS equal unit cells while preserving total 5:3:4 execution widths', () => {
    const { container } = render(<SchedulingGanttChart result={fcfs()} />)
    const widths = [...container.querySelectorAll('.segment-block')].map(rect => Number(rect.getAttribute('width')))
    expect(widths).toHaveLength(12)
    expect(new Set(widths).size).toBe(1)
    expect(container.querySelectorAll('[data-process="P1"]').length / container.querySelectorAll('[data-process="P2"]').length).toBeCloseTo(5 / 3)
  })

  it('renders equal durations with equal widths', () => {
    const result = schedule(workload([0, 0, 0], [2, 2, 2]), { algorithm: 'FCFS' })
    const { container } = render(<SchedulingGanttChart result={result} />)
    expect(new Set([...container.querySelectorAll('.segment-block')].map(rect => rect.getAttribute('width'))).size).toBe(1)
  })

  it('splits both idle intervals into neutral one-unit cells', () => {
    const result = schedule(workload([3, 10], [4, 2]), { algorithm: 'FCFS' })
    const { container } = render(<SchedulingGanttChart result={result} />)
    const idle = container.querySelectorAll('[data-process="IDLE"]')
    expect([...idle].map(node => [node.getAttribute('data-start'), node.getAttribute('data-end')])).toEqual([['0','1'], ['1','2'], ['2','3'], ['7','8'], ['8','9'], ['9','10']])
    expect(idle[0].querySelector('.segment-block')).toHaveAttribute('fill', '#68758a')
    fireEvent.click(idle[0])
    expect(screen.getByRole('region', { name: 'Interval details' })).toHaveTextContent('No process is ready during this interval.')
  })

  it('preserves SRTF ownership and resumed process colors in all fourteen unit cells', () => {
    const result = schedule(workload([0, 1, 2], [8, 4, 2]), { algorithm: 'SRTF' })
    const { container } = render(<SchedulingGanttChart result={result} />)
    const turns = [...container.querySelectorAll('[data-gantt-segment]')]
    expect(turns.map(node => [node.getAttribute('data-process'), node.getAttribute('data-start'), node.getAttribute('data-end')])).toEqual(['P1','P2','P3','P3','P2','P2','P2','P1','P1','P1','P1','P1','P1','P1'].map((id,index)=>[id,String(index),String(index+1)]))
    expect(turns[0].querySelector('rect')?.getAttribute('fill')).toBe(turns[7].querySelector('rect')?.getAttribute('fill'))
    expect(turns[1].querySelector('rect')?.getAttribute('fill')).toBe(turns[4].querySelector('rect')?.getAttribute('fill'))
  })

  it('supports pointer, keyboard and touch-style clicks with actual interval details', () => {
    const result = schedule(workload([0, 1], [5, 2]), { algorithm: 'RR', quantum: 2 })
    const { container } = render(<SchedulingGanttChart result={result} />)
    const second = container.querySelector('[data-gantt-segment="2"]')!
    fireEvent.focus(second)
    const inspector = within(screen.getByRole('region', { name: 'Interval details' }))
    expect(inspector.getByText('Start Time').nextElementSibling).toHaveTextContent('2')
    expect(inspector.getByText('End Time').nextElementSibling).toHaveTextContent('3')
    expect(inspector.getByText('Original Burst Time').nextElementSibling).toHaveTextContent('2')
    expect(inspector.getByText('Remaining After Interval').nextElementSibling).toHaveTextContent('1')
    fireEvent.keyDown(second, { key: 'ArrowRight' })
    expect(screen.getByLabelText('Inspect interval')).toHaveValue(4)
    expect(container.querySelector('[data-gantt-segment="3"]')).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    expect(screen.getByLabelText('Inspect interval')).toHaveValue(5)
    fireEvent.click(container.querySelector('[data-gantt-segment="0"]')!)
    expect(inspector.getByText('Remaining After Interval').nextElementSibling).toHaveTextContent('4')
    fireEvent.pointerMove(second, { pointerType: 'mouse' })
    expect(inspector.getByText('Remaining After Interval').nextElementSibling).toHaveTextContent('1')
  })

  it('changes visual zoom without mutating result data and restores/reset fits', () => {
    const result = fcfs(), before = JSON.stringify(result)
    render(<SchedulingGanttChart result={result} />)
    const svg = screen.getByRole('group', { name: 'FCFS Gantt chart' })
    const original = Number(svg.getAttribute('width'))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom In' }))
    expect(Number(svg.getAttribute('width'))).toBe((original - 76) * 2 + 76)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom Out' }))
    expect(Number(svg.getAttribute('width'))).toBe(original)
    fireEvent.click(screen.getByRole('button', { name: 'Fit to Screen' }))
    expect(screen.getByLabelText('Chart zoom')).toHaveTextContent('FIT')
    fireEvent.click(screen.getByRole('button', { name: 'Reset Zoom' }))
    expect(Number(svg.getAttribute('width'))).toBe(original)
    expect(JSON.stringify(result)).toBe(before)
  })

  it('keeps tiny intervals inspectable and long timelines bounded with scroll virtualization', () => {
    const result = schedule(workload([0, 10000], [1, 1]), { algorithm: 'FCFS' })
    render(<SchedulingGanttChart result={result} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fit to Screen' }))
    fireEvent.change(screen.getByLabelText('Inspect interval'), { target: { value: '10001' } })
    expect(screen.getByRole('region', { name: 'Interval details' })).toHaveTextContent('10000')
    expect(screen.getByRole('region', { name: 'Interval details' })).toHaveTextContent('P2')
    expect(ganttWidth(Number.MAX_SAFE_INTEGER, 320, 16, false)).toBeLessThanOrEqual(384000)
    expect(ganttWidth(1, 305, 1, true)).toBe(305)
  })

  it('windows a dense schedule and renders the actual final interval when navigating offscreen', () => {
    const result = schedule(workload([0], [1000]), { algorithm: 'RR', quantum: 1 })
    const { container } = render(<SchedulingGanttChart result={result} />)
    expect(container.querySelectorAll('[data-gantt-segment]').length).toBeLessThan(100)
    expect(container.querySelector('[data-gantt-segment="999"]')).toBeNull()
    fireEvent.change(screen.getByLabelText('Inspect interval'), { target: { value: '1000' } })
    expect(container.querySelector('[data-gantt-segment="999"]')).toHaveAttribute('data-start', '999')
    expect(container.querySelector('[data-gantt-segment="999"]')).toHaveAttribute('data-end', '1000')
    expect(screen.getByRole('region', { name: 'Interval details' })).toHaveTextContent('Remaining After Interval0')
    fireEvent.click(screen.getByRole('button', { name: 'Fit to Screen' }))
    expect(Number(screen.getByRole('group', { name: 'RR Gantt chart' }).getAttribute('width'))).toBeGreaterThan(800)
    expect(container.querySelectorAll('[data-gantt-segment]').length).toBeLessThan(400)
  })

  it('renders a truthful empty state before any calculation', () => {
    render(<SchedulingGanttChart result={null} />)
    expect(screen.getByText('No calculated timeline')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument()
  })

  it('uses stable extended process colors independent of rerender order', () => {
    expect(processColor('P1').value).toBe('#E53935')
    expect(processColor('P9').value).not.toBe(processColor('P1').value)
    expect(processColor('custom-process')).toEqual(processColor('custom-process'))
  })
})

describe('time axis and event snapshots', () => {
  it('suppresses crowded labels without moving boundary coordinates', () => {
    const scale = ganttScale(0, 1000, 400)
    const times = [0, 1, 2, 3, 999, 1000]
    const visible = visibleTimeLabels(times, scale.x)
    expect(visible.has(0)).toBe(true)
    expect(visible.has(1000)).toBe(true)
    expect(visible.has(1)).toBe(false)
    expect(scale.x(1000) - scale.x(0)).toBe(324)
    expect(scale.x(3)).toBeCloseTo(38 + 3 * scale.pixelsPerUnit)
  })

  it('reserves enough endpoint padding for large timestamps on mobile screens', () => {
    const end = Number.MAX_SAFE_INTEGER
    const scale = ganttScale(0, end, 280)
    expect(scale.x(end) + String(end).length * 3.7).toBeLessThanOrEqual(270)
    expect(scale.x(0)).toBe(38)
    expect(scale.x(end)).toBeLessThan(242)
  })

  it('derives remaining-after values from actual execution intervals, including RR resumes', () => {
    const result = schedule(workload([0], [5]), { algorithm: 'RR', quantum: 2 })
    expect(segmentDetails(result).map(segment => segment.remainingAfter)).toEqual([3, 1, 0])
  })

  it.each(['FCFS', 'RR', 'MLQ', 'MLFQ'] as const)('keeps every %s same-time event snapshot in engine order', algorithm => {
    const fixture = lectureInputExamples.find(item => item.config.algorithm === algorithm)!
    const result = schedule(fixture.processes, fixture.config)
    result.events.forEach((event, index) => {
      const view = simulationView(result, event.timestamp, index)
      expect(view.readyQueues).toEqual(event.readyQueues)
      expect(view.runningId).toBe(event.runningProcessId)
      event.remainingBurstTimes.forEach(process => expect(view.processes.find(p => p.id === process.processId)!.remaining).toBe(process.remainingTime))
    })
  })

  it('decrements only the running burst between snapshots and keeps ready order from events', () => {
    const result = fcfs()
    const index = result.events.findLastIndex(event => event.timestamp <= 4)
    const view = simulationView(result, 4.5, index)
    expect(view.runningId).toBe('P1')
    expect(view.processes.map(process => process.remaining)).toEqual([0.5, 3, 4])
    expect(view.readyQueues[0].processIds).toEqual(['P2', 'P3'])
  })
})

describe('playback and synchronization', () => {
  it('plays at CPU-time speed, pauses, changes speed, restarts and completes without advancing past the end', () => {
    vi.useFakeTimers()
    const result = fcfs()
    const hook = renderHook(() => useSimulationPlayback(result, false))
    act(() => hook.result.current.play())
    act(() => vi.advanceTimersByTime(2000))
    expect(hook.result.current.time).toBeCloseTo(2)
    act(() => hook.result.current.pause())
    act(() => vi.advanceTimersByTime(1000))
    expect(hook.result.current.time).toBeCloseTo(2)
    act(() => hook.result.current.setSpeed(4))
    act(() => hook.result.current.play())
    act(() => vi.advanceTimersByTime(1000))
    expect(hook.result.current.time).toBeCloseTo(6)
    act(() => vi.advanceTimersByTime(10000))
    expect(hook.result.current.time).toBe(12)
    expect(hook.result.current.playing).toBe(false)
    expect(hook.result.current.eventIndex).toBe(result.events.length - 1)
    act(() => hook.result.current.restart())
    expect(hook.result.current.time).toBe(0)
    expect(hook.result.current.eventIndex).toBe(-1)
    expect(hook.result.current.playing).toBe(false)
  })

  it('supports 0.5×, 1×, 2× and 4× playback options', () => {
    render(<SchedulingGanttChart result={fcfs()} />)
    expect(within(screen.getByLabelText('Playback Speed')).getAllByRole('option').map(option => option.textContent)).toEqual(['0.5×', '1×', '2×', '4×'])
  })

  it('steps every event including ties, displays its reason, highlights the running process and permits reverse steps', () => {
    const result = fcfs()
    const { container } = render(<SchedulingGanttChart result={result} />)
    const eventPanel = screen.getByRole('region', { name: 'Scheduling event step' })
    for (const event of result.events.slice(0, 5)) {
      fireEvent.click(screen.getByRole('button', { name: 'Next Step' }))
      expect(eventPanel).toHaveTextContent(event.explanation)
      expect(eventPanel).toHaveTextContent(`sequence ${event.sequence}`)
    }
    expect(container.querySelector('[data-gantt-segment="4"]')).toHaveClass('active-segment')
    expect(within(screen.getByRole('region', { name: 'MISSION STATUS' })).getByText('CPU RUNNING')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Previous Step' }))
    expect(eventPanel).toHaveTextContent(result.events[3].explanation)
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect(eventPanel).toHaveTextContent('Ready for playback')
  })

  it('shows real running, idle, remaining and completed states when seeking', () => {
    const result = schedule(workload([3, 10], [4, 2]), { algorithm: 'FCFS' })
    const { container } = render(<SchedulingGanttChart result={result} />)
    const status = within(screen.getByRole('region', { name: 'MISSION STATUS' }))
    fireEvent.change(screen.getByLabelText('Seek simulation time'), { target: { value: '2' } })
    expect(status.getByText('CPU IDLE')).toBeInTheDocument()
    expect(container.querySelector('[data-gantt-segment="2"]')).toHaveClass('active-segment')
    fireEvent.change(screen.getByLabelText('Seek simulation time'), { target: { value: '4' } })
    expect(status.getByText('CPU RUNNING')).toBeInTheDocument()
    expect(container.querySelector('[data-process-state="running"]')).toHaveTextContent('P1')
    expect(container.querySelector('[data-process-state="running"]')).toHaveTextContent('3')
    fireEvent.change(screen.getByLabelText('Seek simulation time'), { target: { value: '12' } })
    expect(status.getByText('2/2')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-process-state="completed"]')).toHaveLength(2)
  })

  it('stops and disables stale playback/export, and starts a fresh session after recalculation', () => {
    vi.useFakeTimers()
    const result = fcfs()
    const view = render(<SchedulingGanttChart result={result} />)
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    act(() => vi.advanceTimersByTime(1000))
    view.rerender(<SchedulingGanttChart result={result} outdated />)
    const previousTime = screen.getByLabelText('Seek simulation time').getAttribute('value')
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByLabelText('Seek simulation time')).toHaveAttribute('value', previousTime)
    expect(screen.getByText('OUTDATED TIMELINE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export PNG' })).toBeDisabled()
    view.rerender(<SchedulingGanttChart result={schedule(workload([0], [3]), { algorithm: 'SJF' })} />)
    expect(screen.getByLabelText('Seek simulation time')).toHaveValue('0')
    expect(screen.getByRole('group', { name: 'SJF Gantt chart' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled()
  })

  it('cleans up playback timers when the chart unmounts', () => {
    vi.useFakeTimers()
    const view = render(<SchedulingGanttChart result={fcfs()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(vi.getTimerCount()).toBe(1)
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('opens a usable expanded view when native fullscreen is unavailable and exits with Escape', async () => {
    render(<SchedulingGanttChart result={fcfs()} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Fullscreen View' })))
    expect(screen.getByRole('dialog', { name: 'Expanded CPU execution timeline' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exit Fullscreen' })).toBeInTheDocument()
    await act(async () => fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('real chart export', () => {
  it('exports standalone SVG with all intervals, exact coordinates, colors, labels and boundary times', () => {
    const result = fcfs()
    const xml = buildGanttSvg(result, 1200)
    const document = new DOMParser().parseFromString(xml, 'image/svg+xml')
    expect(document.querySelector('parsererror')).toBeNull()
    expect(document.documentElement.getAttribute('width')).toBe('1200')
    expect(xml).toContain('P1: 0–1; duration 1')
    expect(xml).toContain('P2: 5–6; duration 1')
    expect(xml).toContain('P3: 8–9; duration 1')
    expect(xml).toContain('#E53935')
    const scale = ganttScale(0, 12, 1200)
    expect(xml).toContain(`x="${scale.x(8)}"`)
    expect(xml).toContain('Time 12')
    expect(buildGanttSvg(result, 999999)).toContain('width="16000"')
  })

  it('includes every offscreen interval in SVG exports even when rendering uses a window', () => {
    const result = schedule(workload([0], [100]), { algorithm: 'RR', quantum: 1 })
    const xml = buildGanttSvg(result)
    expect((xml.match(/duration 1</g) ?? []).length).toBe(100)
    expect(xml).toContain('P1: 99–100')
  })

  it('wires SVG and PNG buttons to the export service with the actual result', async () => {
    const exporter = vi.spyOn(exports, 'exportGantt').mockResolvedValue()
    const result = fcfs()
    render(<SchedulingGanttChart result={result} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Export SVG' })))
    expect(exporter).toHaveBeenCalledWith(result, 'svg', expect.any(Number))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Export PNG' })))
    expect(exporter).toHaveBeenCalledWith(result, 'png', expect.any(Number))
  })

  it('rasterizes the SVG into a PNG Blob and revokes its image URL', async () => {
    const create = vi.fn(() => 'blob:chart'), revoke = vi.fn(), draw = vi.fn()
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke })
    class ImageDouble {
      naturalWidth = 1200; naturalHeight = 230; onload: (() => void) | null = null
      set src(_url: string) { queueMicrotask(() => this.onload?.()) }
    }
    vi.stubGlobal('Image', ImageDouble)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: draw } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['PNG bytes'], { type: 'image/png' })))
    const png = await ganttPng(buildGanttSvg(fcfs()))
    expect(png.type).toBe('image/png')
    expect(png.size).toBeGreaterThan(0)
    expect(draw).toHaveBeenCalledOnce()
    expect(revoke).toHaveBeenCalledWith('blob:chart')
  })

  it('creates a real download link with filename and cleans up its object URL', () => {
    vi.useFakeTimers()
    const revoke = vi.fn(), click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('fcfs-cpu-timeline.svg')
      expect(this.href).toContain('blob:download')
    })
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:download', revokeObjectURL: revoke })
    downloadBlob(new Blob(['<svg/>'], { type: 'image/svg+xml' }), 'fcfs-cpu-timeline.svg')
    expect(click).toHaveBeenCalledOnce()
    expect(document.querySelector('a[download]')).toBeNull()
    act(() => vi.runOnlyPendingTimers())
    expect(revoke).toHaveBeenCalledWith('blob:download')
  })

  it('reports export failures without claiming a download succeeded', async () => {
    vi.spyOn(exports, 'exportGantt').mockRejectedValue(new Error('Canvas could not encode the chart.'))
    render(<SchedulingGanttChart result={fcfs()} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Export PNG' })))
    expect(screen.getByRole('alert')).toHaveTextContent('Canvas could not encode')
    expect(screen.queryByText(/PNG exported/)).not.toBeInTheDocument()
  })
})
