import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { schedule } from '../engine/scheduler'
import { SchedulingResultWorkspace } from '../components/results/SchedulingResultWorkspace'
import { CPUUtilizationPanel } from '../components/results/CPUUtilizationPanel'
import { CopyResultButton } from '../components/results/CopyResultButton'
import { performanceFormulas, processFormulas, formulaResult, resultCalculationText, resultTableText, sortedProcesses } from '../utils/resultFormatting'
import { explainEvent, eventLabel } from '../utils/explanationGenerator'
import { lectureInputExamples } from '../data/lectureExamples'
import { lectureExamples, workload } from './fixtures/lectureExamples'
import type { SchedulingResult } from '../types/scheduling'

const fcfs = () => schedule(workload([0, 2, 4], [5, 3, 4]), { algorithm: 'FCFS' })
function workspace(result: SchedulingResult | null = fcfs(), outdated = false, error: string | null = null) {
  return <SchedulingResultWorkspace result={result} outdated={outdated} error={error} canCalculate={!outdated} onRecalculate={() => {}} />
}
function table() { return within(screen.getByRole('table', { name: 'Calculated process results' })) }
function values(id: string) { return within(table().getByRole('rowheader', { name: id }).closest('tr')!).getAllByRole('cell').map(cell => cell.textContent) }
function summary() { return within(screen.getByRole('region', { name: 'MISSION PERFORMANCE SUMMARY' })) }
function log() { fireEvent.click(screen.getByRole('tab', { name: 'MISSION EXECUTION LOG' })); return within(screen.getByRole('tabpanel', { name: 'MISSION EXECUTION LOG' })) }
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('accurate result tables and mathematical solutions', { timeout: 20_000 }, () => {
  it('displays every mandatory FCFS value, exact fraction and substituted P2 calculation', () => {
    render(workspace())
    expect(values('P1')).toEqual(['0', '5', '5', '5', '0', '0'])
    expect(values('P2')).toEqual(['2', '3', '8', '6', '3', '3'])
    expect(values('P3')).toEqual(['4', '4', '12', '8', '4', '4'])
    expect(screen.getByText('Average Waiting Time').nextElementSibling).toHaveTextContent('2.3333')
    expect(screen.getByText('Average Turnaround Time').nextElementSibling).toHaveTextContent('6.3333')
    expect(screen.getByText('Average Response Time').nextElementSibling).toHaveTextContent('2.3333')
    expect(screen.getByText('CPU Utilization').nextElementSibling).toHaveTextContent('100%')
    expect(summary().getByText('Average WT = (0 + 3 + 4) / 3')).toBeInTheDocument()
    expect(summary().getByText('Average WT = 7 / 3')).toBeInTheDocument()
    fireEvent.click(summary().getByRole('button', { name: 'Expand All' }))
    expect(summary().getByText('Average TT = (5 + 6 + 8) / 3')).toBeInTheDocument()
    expect(summary().getByText('Average TT = 19 / 3')).toBeInTheDocument()
    expect(summary().getByText('Average RT = 7 / 3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Select process P2' }))
    const details = within(screen.getByRole('region', { name: 'CREWMATE CALCULATION DETAILS' }))
    expect(details.getByText('TT = 8 − 2')).toBeInTheDocument()
    expect(details.getByText('TT = 6')).toBeInTheDocument()
    expect(details.getByText('WT = 6 − 3')).toBeInTheDocument()
    expect(details.getByText('RT = 5 − 2')).toBeInTheDocument()
    expect(details.getByText('5–8')).toBeInTheDocument()
  })

  it.each(['FCFS', 'SJF', 'NPP', 'SRTF', 'PP', 'RR', 'MLQ', 'MLFQ'] as const)('shows audited %s completions and engine timing values without inventing answers', algorithm => {
    const input = lectureInputExamples.find(example => example.config.algorithm === algorithm)!
    const fixture = lectureExamples.find(example => example.page === input.page)!
    const result = schedule(input.processes, input.config)
    render(workspace(result))
    result.processes.forEach((process, index) => {
      expect(values(process.id).slice(0, 6)).toEqual([process.arrivalTime, process.burstTime, fixture.completion[index], process.turnaroundTime, process.waitingTime, process.responseTime].map(String))
    })
    expect(screen.getByRole('heading', { name: 'MISSION REPORT — CPU SCHEDULING RESULTS' })).toBeInTheDocument()
    expect(screen.getByText('Average Waiting Time').nextElementSibling).toHaveAttribute('title', `Unrounded value: ${result.metrics.averageWaitingTime}`)
    if (algorithm === 'NPP' || algorithm === 'PP' || algorithm === 'MLQ') expect(table().getByRole('columnheader', { name: 'Priority' })).toBeInTheDocument()
    if (algorithm === 'MLQ' || algorithm === 'MLFQ') expect(table().getByRole('columnheader', { name: 'Initial Queue' })).toBeInTheDocument()
  })

  it('sorts the displayed table by each supported key in both directions without mutating engine order', () => {
    const result = schedule(workload([3, 0, 2], [2, 5, 1]).map((process, index) => ({ ...process, id: ['P10', 'P2', 'P1'][index] })), { algorithm: 'FCFS' })
    const before = JSON.stringify(result)
    render(workspace(result))
    const ids = () => table().getAllByRole('rowheader').map(header => header.getAttribute('aria-label'))
    expect(ids()).toEqual(['P1', 'P2', 'P10'])
    for (const [label, key] of [['arrival time', 'arrivalTime'], ['burst time', 'burstTime'], ['completion time', 'completionTime'], ['process ID', 'id']] as const) {
      fireEvent.click(screen.getByRole('button', { name: `Sort by ${label}` }))
      expect(ids()).toEqual(sortedProcesses(result.processes, key, 'ascending').map(process => process.id))
      fireEvent.click(screen.getByRole('button', { name: `Sort by ${label}` }))
      expect(ids()).toEqual(sortedProcesses(result.processes, key, 'descending').map(process => process.id))
    }
    expect(JSON.stringify(result)).toBe(before)
  })

  it('links table and picker selection to every matching resumed Gantt interval', () => {
    const result = schedule(workload([0, 1, 2], [8, 4, 2]), { algorithm: 'SRTF' })
    const view = render(workspace(result))
    fireEvent.click(screen.getByRole('button', { name: 'Select process P2' }))
    expect(screen.getByLabelText('Inspect process')).toHaveValue('P2')
    expect(view.container.querySelector('[data-result-process="P2"]')).toHaveAttribute('data-selected', 'true')
    expect([...view.container.querySelectorAll('.process-selected-segment')].map(node => node.getAttribute('data-process'))).toEqual(['P2', 'P2'])
    fireEvent.change(screen.getByLabelText('Inspect process'), { target: { value: 'P1' } })
    expect([...view.container.querySelectorAll('.process-selected-segment')].map(node => node.getAttribute('data-process'))).toEqual(['P1', 'P1'])
    const details = within(screen.getByRole('region', { name: 'CREWMATE CALCULATION DETAILS' }))
    expect(details.getByText('0–1')).toBeInTheDocument()
    expect(details.getByText('7–14')).toBeInTheDocument()
    expect(details.getByText('WT = 14 − 8')).toBeInTheDocument()
    expect(details.getByText('WT = 6')).toBeInTheDocument()
    expect(details.getByText('RT = 0 − 0')).toBeInTheDocument()
    expect(details.getByText('RT = 0')).toBeInTheDocument()
  })

  it('expands and collapses all performance formulas and toggles an individual formula', () => {
    render(workspace())
    const area = summary()
    fireEvent.click(area.getByRole('button', { name: 'Collapse All' }))
    expect(area.queryByText('Average WT = 7 / 3')).not.toBeInTheDocument()
    fireEvent.click(area.getByRole('button', { name: 'Show formula for Average TT' }))
    expect(area.getByText('Average TT = 19 / 3')).toBeInTheDocument()
    fireEvent.click(area.getByRole('button', { name: 'Hide formula for Average TT' }))
    expect(area.queryByText('Average TT = 19 / 3')).not.toBeInTheDocument()
    fireEvent.click(area.getByRole('button', { name: 'Expand All' }))
    expect(area.getAllByRole('button', { name: /Hide formula/ })).toHaveLength(9)
  })

  it('copies exact table and full calculations with real clipboard writes', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const result = fcfs()
    render(workspace(result))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy Table Data' })))
    expect(writeText).toHaveBeenLastCalledWith(resultTableText(result))
    expect(writeText.mock.lastCall![0]).toContain('P2\t2\t3\t8\t6\t3\t3')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy Calculations' })))
    expect(writeText).toHaveBeenLastCalledWith(resultCalculationText(result))
    expect(writeText.mock.lastCall![0]).toContain('Average TT = 19 / 3')
    expect(writeText.mock.lastCall![0]).toContain('RT = 5 − 2')
    expect(screen.getByRole('status', { name: 'Copy Calculations status' })).toHaveTextContent('Copied')
  })

  it('offers manual selectable copy text when browser clipboard permission is unavailable', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } })
    render(<CopyResultButton label="Copy Table Data" text={'P1\t0\t5'} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy Table Data' })))
    expect(screen.getByRole('textbox', { name: 'Copy Table Data manually' })).toHaveValue('P1\t0\t5')
    expect(screen.queryByText('Copied to clipboard.')).not.toBeInTheDocument()
  })

  it('matches idle intervals, utilization, throughput and origin-based makespan', () => {
    const result = schedule(workload([3], [12]), { algorithm: 'FCFS' })
    render(workspace(result))
    expect(screen.getByText('CPU Utilization').nextElementSibling).toHaveTextContent('80%')
    expect(screen.getByText('Total Idle Time').nextElementSibling).toHaveTextContent('3')
    expect(screen.getByText('Makespan').nextElementSibling).toHaveTextContent('15')
    const formulas = performanceFormulas(result)
    expect(formulas.find(model => model.id === 'utilization')!.exact).toBe('CPU Utilization = (12 / 15) × 100')
    expect(formulas.find(model => model.id === 'throughput')!.value).toBe(1 / 15)
    expect(formulas.find(model => model.id === 'idle')!.terms).toEqual([{ label: '0–3', value: 3 }])
  })

  it('safely describes zero-duration observation without displaying NaN or Infinity', () => {
    const result = fcfs()
    result.metrics = { ...result.metrics, totalObservedTime: 0, totalBusyTime: 0, totalIdleTime: 0, cpuUtilization: NaN, throughput: Infinity }
    render(<CPUUtilizationPanel result={result} />)
    expect(screen.getByText('Undefined — zero observation duration')).toBeInTheDocument()
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument()
    expect(formulaResult(performanceFormulas(result).find(model => model.id === 'utilization')!)).toMatch(/Undefined/)
    expect(performanceFormulas(result).find(model => model.id === 'throughput')!.value).toBeNull()
  })

  it('retains exact values and never reuses the mandatory example for an unrelated dataset', () => {
    const result = schedule(workload([4, 9], [2, 1]), { algorithm: 'FCFS' })
    const text = resultCalculationText(result)
    expect(text).toContain('Average WT = (0 + 0) / 2')
    expect(text).not.toContain('Average TT = 19 / 3')
    expect(processFormulas(result.processes[1]).find(model => model.id === 'turnaround')!.substitution).toBe('TT = 10 − 9')
    expect(result.metrics.averageTurnaroundTime).toBe(1.5)
  })

  it('keeps every preemptive interval accessible through pagination', () => {
    const result = schedule(workload([0], [30]), { algorithm: 'RR', quantum: 1 })
    render(workspace(result))
    const details = within(screen.getByRole('region', { name: 'CREWMATE CALCULATION DETAILS' }))
    expect(details.getByText('0–1')).toBeInTheDocument()
    expect(details.queryByText('29–30')).not.toBeInTheDocument()
    fireEvent.click(details.getByRole('button', { name: 'Next intervals' }))
    expect(details.getByText('29–30')).toBeInTheDocument()
  })
})

describe('recorded educational explanations', () => {
  it.each(['FCFS', 'SJF', 'NPP', 'SRTF', 'PP', 'RR', 'MLQ', 'MLFQ'] as const)('explains %s using its actual decisions, candidates and next event', algorithm => {
    const input = lectureInputExamples.find(example => example.config.algorithm === algorithm)!
    const result = schedule(input.processes, input.config)
    const index = result.events.findIndex(event => event.type === 'process-selected')
    const explanation = explainEvent(result, index)!
    expect(explanation.event).toBe(result.events[index])
    expect(explanation.next).toBe(result.events[index + 1])
    expect(explanation.arrived).toEqual(result.events[index].remainingBurstTimes.map(process => process.processId))
    expect(explanation.interval?.processId).toBe(result.events[index].runningProcessId)
    const notes = explanation.notes.join(' ')
    expect(notes).toContain(algorithm)
    expect(notes).not.toContain('was preempted')
    if (algorithm === 'FCFS') expect(notes).toContain('arrival time')
    if (algorithm === 'SJF') expect(notes).toContain('shortest available burst')
    if (algorithm === 'RR') expect(notes).toContain('quantum = 3')
    if (algorithm === 'MLQ') expect(notes).toContain('fixed queue membership')
    if (algorithm === 'MLFQ') expect(notes).toContain('demotes one level')
  })

  it('reports genuine SRTF preemption and the actual remaining-time comparison inputs', () => {
    const result = schedule(workload([0, 1, 2], [8, 4, 2]), { algorithm: 'SRTF' })
    const index = result.events.findIndex(event => event.type === 'process-preempted')
    const explanation = explainEvent(result, index)!
    expect(explanation.event.processId).toBe('P1')
    expect(explanation.event.explanation).toMatch(/preempts P1/)
    expect(explanation.interval).toMatchObject({ processId: 'P1', startTime: 0, endTime: 1 })
    expect(explanation.facts.map(fact => [fact.id, fact.remaining])).toEqual([['P1', 7], ['P2', 4]])
  })

  it('respects higher-first priority and the configured deferred MLQ boundary', () => {
    const result = schedule(workload([0, 1], [5, 2], [1, 9]), { algorithm: 'PP', priorityDirection: 'higher-first' })
    const explanation = explainEvent(result, result.events.findIndex(event => event.type === 'process-preempted'))!
    expect(explanation.notes.join(' ')).toContain('higher numbers as higher priority')
    expect(explanation.facts.map(fact => fact.priority)).toEqual([1, 9])
    const input = lectureInputExamples.find(example => example.page === 25)!
    const mlq = schedule(input.processes, input.config)
    expect(explainEvent(mlq, 0)!.notes.join(' ')).toContain('deferred until the current scheduling boundary')
  })

  it('shows actual configured MLFQ promotion, demotion, aging and boosting events', () => {
    const result = schedule(workload([0, 0], [14, 3], undefined, [1, 2]), { algorithm: 'MLFQ', levels: [{ level: 1, policy: { algorithm: 'RR', quantum: 1 } }, { level: 2, policy: { algorithm: 'RR', quantum: 2 } }, { level: 3, policy: { algorithm: 'FCFS' } }], agingInterval: 2, boostInterval: 5 })
    for (const type of ['process-demoted', 'process-promoted', 'priority-boost'] as const) {
      const index = result.events.findIndex(event => event.type === type)
      expect(index).toBeGreaterThanOrEqual(0)
      const explanation = explainEvent(result, index)!
      expect(explanation.event.explanation).toBe(result.events[index].explanation)
      expect(explanation.notes.join(' ')).toContain('aging interval: 2')
      expect(explanation.notes.join(' ')).toContain('boost interval: 5')
    }
  })
})

describe('one synchronized educational walkthrough', { timeout: 15_000 }, () => {
  it('updates event, time, selected process, active interval and mission status from a shared step', () => {
    const result = schedule(workload([0, 1, 2], [8, 4, 2]), { algorithm: 'SRTF' })
    const { container } = render(workspace(result))
    const panel = log()
    fireEvent.click(panel.getByRole('button', { name: 'Show All Steps' }))
    const index = result.events.findIndex(event => event.type === 'process-started' && event.processId === 'P3')
    fireEvent.click(panel.getByRole('button', { name: `Inspect event ${index + 1}` }))
    expect(panel.getByRole('region', { name: 'Detailed scheduling decision' })).toHaveTextContent(result.events[index].explanation)
    expect(screen.getByLabelText('Seek simulation time')).toHaveValue('2')
    expect(container.querySelector('[data-result-process="P3"]')).toHaveAttribute('data-selected', 'true')
    expect(container.querySelector('.active-segment')).toHaveAttribute('data-process', 'P3')
    expect(within(screen.getByRole('region', { name: 'MISSION STATUS' })).getByText('CPU RUNNING')).toBeInTheDocument()
    fireEvent.click(panel.getByRole('button', { name: 'Previous Explanation Step' }))
    expect(panel.getByRole('region', { name: 'Detailed scheduling decision' })).toHaveTextContent(result.events[index - 1].explanation)
    fireEvent.click(panel.getByRole('button', { name: 'Next Explanation Step' }))
    expect(panel.getByRole('region', { name: 'Detailed scheduling decision' })).toHaveTextContent(result.events[index].explanation)
    fireEvent.click(panel.getByRole('button', { name: 'Restart Explanation' }))
    expect(panel.getByRole('region', { name: 'Detailed scheduling decision' })).toHaveTextContent(result.events[0].explanation)
    expect(screen.getByLabelText('Seek simulation time')).toHaveValue('0')
  })

  it('walks same-timestamp events in exact engine sequence and keeps one playback timer', () => {
    vi.useFakeTimers()
    const result = fcfs()
    const intervals = vi.spyOn(window, 'setInterval'), clears = vi.spyOn(window, 'clearInterval')
    render(workspace(result))
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(intervals).toHaveBeenCalledOnce()
    const panel = log()
    for (let index = 0; index < 3; index++) {
      fireEvent.click(panel.getByRole('button', { name: 'Next Explanation Step' }))
      const decision = panel.getByRole('region', { name: 'Detailed scheduling decision' })
      expect(decision).toHaveTextContent(`SEQUENCE ${index}`)
      expect(decision).toHaveTextContent(eventLabel(result.events[index]))
    }
    expect(clears).toHaveBeenCalledWith(intervals.mock.results[0].value)
    expect(screen.getByLabelText('Seek simulation time')).toHaveValue('0')
  })

  it('makes every event accessible in paginated Show All Steps without truncation', () => {
    const input = lectureInputExamples.find(example => example.page === 27)!
    const result = schedule(input.processes, input.config)
    render(workspace(result))
    const panel = log()
    fireEvent.click(panel.getByRole('button', { name: 'Show All Steps' }))
    expect(panel.getAllByRole('button', { name: /Inspect event/ })).toHaveLength(25)
    fireEvent.click(panel.getByRole('button', { name: 'Last page' }))
    fireEvent.click(panel.getByRole('button', { name: `Inspect event ${result.events.length}` }))
    expect(panel.getByRole('region', { name: 'Detailed scheduling decision' })).toHaveTextContent('End of the recorded schedule.')
    expect(screen.getByLabelText('Seek simulation time')).toHaveValue(String(result.metrics.observationEndTime))
    expect(within(screen.getByRole('region', { name: 'MISSION STATUS' })).getByText('5/5')).toBeInTheDocument()
  })

  it('supports keyboard tab navigation for the educational tablist', () => {
    render(workspace())
    const tab = screen.getByRole('tab', { name: 'CALCULATIONS & FORMULAS' })
    fireEvent.keyDown(tab, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'MISSION EXECUTION LOG' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'MISSION EXECUTION LOG' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'Home' })
    expect(tab).toHaveAttribute('aria-selected', 'true')
  })

  it('labels stale solutions, stops shared playback and disables copying and walkthrough controls', () => {
    vi.useFakeTimers()
    const result = fcfs()
    const view = render(workspace(result))
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    act(() => vi.advanceTimersByTime(500))
    view.rerender(workspace(result, true))
    expect(screen.getByRole('status', { name: 'Outdated solutions' })).toHaveTextContent('OUTDATED SOLUTIONS')
    expect(screen.getByRole('button', { name: 'Copy Table Data' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Copy Calculations' })).toBeDisabled()
    const panel = log()
    expect(panel.getByRole('button', { name: 'Next Explanation Step' })).toBeDisabled()
    expect(panel.getByRole('button', { name: 'Restart Explanation' })).toBeDisabled()
    expect(vi.getTimerCount()).toBe(0)
    view.rerender(workspace(schedule(workload([3], [2]), { algorithm: 'SJF' })))
    expect(screen.queryByRole('status', { name: 'Outdated solutions' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Seek simulation time')).toHaveValue('0')
    expect(screen.getByLabelText('Inspect process')).toHaveValue('P1')
  })

  it('shows truthful empty and error states without a fabricated solution', () => {
    render(workspace(null, false, 'Engine rejected the input.'))
    expect(screen.getByRole('status', { name: 'Result calculation error' })).toHaveTextContent('No successful result is available')
    expect(screen.getByText('No calculated results')).toBeInTheDocument()
    expect(screen.getByText('No calculation details yet')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'MISSION EXECUTION LOG' })).not.toBeInTheDocument()
  })
})
