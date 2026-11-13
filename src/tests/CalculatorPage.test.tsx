import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import * as client from '../services/schedulerClient'
import { executeSimulation } from '../services/simulationTask'
import { lectureExamples } from './fixtures/lectureExamples'
import type { SchedulingRequest } from '../utils/calculator'
import type { SchedulingResult } from '../types/scheduling'

function openCalculator(path = '/calculator') {
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
  return userEvent.setup()
}
const start = () => screen.getByRole('button', { name: 'Start Simulation (Calculate CPU Schedule)' })
async function loadLecture(user: ReturnType<typeof userEvent.setup>, page: number) {
  await user.selectOptions(screen.getByLabelText('LOAD LECTURE EXAMPLE'), String(page))
  await user.click(screen.getByRole('button', { name: 'LOAD & SIMULATE' }))
  await waitFor(() => expect(screen.getByRole('status', { name: 'Calculation status' })).toHaveTextContent('Calculation completed'))
}
function results(outdated = false) {
  return within(screen.getByRole('table', { name: outdated ? 'Previous calculated results — outdated' : 'Calculated process results' }))
}
function resultValues(process: string, outdated = false) {
  const row = results(outdated).getByRole('rowheader', { name: process }).closest('tr')!
  return within(row).getAllByRole('cell').map(cell => cell.textContent)
}
async function replace(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  const field = screen.getByLabelText(label)
  await user.clear(field)
  await user.type(field, value)
}
afterEach(() => vi.restoreAllMocks())

// Multi-step user interactions need headroom when the full suite shares CPU.
describe('interactive calculator integration', { timeout: 30_000 }, () => {
  it('calculates the requested FCFS workload from edited inputs and displays full-precision engine averages', async () => {
    const user = openCalculator()
    for (const [index, arrival, burst] of [[1, 0, 5], [2, 2, 3], [3, 4, 4]]) {
      if (index > 1) await user.click(screen.getByRole('button', { name: 'Add Crewmate (Add Process)' }))
      await user.type(screen.getByLabelText(`P${index} arrival time`), String(arrival))
      await user.type(screen.getByLabelText(`P${index} burst time`), String(burst))
    }
    expect(start()).toBeEnabled()
    await user.click(start())
    await screen.findByText('CALCULATION VERIFIED')
    expect(resultValues('P1')).toEqual(['0', '5', '5', '5', '0', '0'])
    expect(resultValues('P2')).toEqual(['2', '3', '8', '6', '3', '3'])
    expect(resultValues('P3')).toEqual(['4', '4', '12', '8', '4', '4'])
    expect(screen.getByText('Average Waiting Time').nextElementSibling).toHaveTextContent('2.3333')
    expect(screen.getByText('Average Waiting Time').nextElementSibling).toHaveAttribute('title', `Unrounded value: ${7 / 3}`)
    expect(screen.getByText('Average Turnaround Time').nextElementSibling).toHaveTextContent('6.3333')
    expect(screen.getByText('Average Turnaround Time').nextElementSibling).toHaveAttribute('title', `Unrounded value: ${19 / 3}`)
    expect(screen.getByText('CPU Utilization').nextElementSibling).toHaveTextContent('100%')
  })

  it.each([6, 9, 12, 15, 18, 21, 24, 27])('loads page %s, applies its policy, and calculates independently audited completion times', async page => {
    const user = openCalculator()
    await loadLecture(user, page)
    const fixture = lectureExamples.find(example => example.page === page)!
    expect(screen.getByLabelText('Scheduling algorithm')).toHaveValue(fixture.config.algorithm)
    expect(screen.getByRole('group', { name: `${fixture.config.algorithm} Gantt chart` })).toBeInTheDocument()
    fixture.completion.forEach((completion, index) => expect(resultValues(`P${index + 1}`)[2]).toBe(String(completion)))
    expect(screen.getByRole('status', { name: 'Input source' })).toHaveTextContent('Lecture example loaded')
  })

  it('keeps IDs monotonic and preserves hidden priority fields across algorithm changes with keyboard editing', async () => {
    const user = openCalculator('/calculator?algorithm=NPP')
    await user.type(screen.getByLabelText('P1 arrival time'), '0')
    await user.tab()
    expect(screen.getByLabelText('P1 burst time')).toHaveFocus()
    await user.keyboard('4')
    await user.type(screen.getByLabelText('P1 priority'), '7')
    await user.click(screen.getByRole('button', { name: 'Add Crewmate (Add Process)' }))
    await user.click(screen.getByRole('button', { name: 'Remove process P2' }))
    await user.click(screen.getByRole('button', { name: 'Add Crewmate (Add Process)' }))
    expect(screen.getByLabelText('P3 arrival time')).toBeInTheDocument()
    expect(screen.queryByLabelText('P2 arrival time')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Scheduling algorithm'), 'FCFS')
    expect(screen.queryByLabelText('P1 priority')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Scheduling algorithm'), 'NPP')
    expect(screen.getByLabelText('P1 priority')).toHaveValue(7)
    expect(screen.getByLabelText('P1 burst time')).toHaveValue(4)
  })

  it('loads successive lecture algorithms from an existing deep link without the previous URL cancelling the calculation', async () => {
    const user = openCalculator('/calculator?algorithm=MLFQ')
    await loadLecture(user, 27)
    await loadLecture(user, 6)
    expect(screen.getByLabelText('Scheduling algorithm')).toHaveValue('FCFS')
    expect(resultValues('P1')[2]).toBe('11')
    expect(screen.getByRole('status', { name: 'Input source' })).toHaveTextContent('page 6')
    await loadLecture(user, 21)
    expect(screen.getByLabelText('Scheduling algorithm')).toHaveValue('RR')
    expect(screen.getByLabelText('Time quantum q')).toHaveValue(3)
    expect(screen.queryByText('OUTDATED REPORT')).not.toBeInTheDocument()
  })

  it('configures MLQ policies, quantum, priorities and assignments without silently moving removed-queue processes', async () => {
    const user = openCalculator()
    await loadLecture(user, 24)
    await user.selectOptions(screen.getByLabelText('Queue 1 scheduling policy'), 'RR')
    await replace(user, 'Queue 1 time quantum', '3')
    await replace(user, 'Queue 1 priority', '2')
    await user.selectOptions(screen.getByLabelText('P1 queue assignment'), '2')
    expect(screen.queryByLabelText('P1 priority')).not.toBeInTheDocument()
    await user.click(screen.getByLabelText('Preempt lower-priority queues'))
    await user.click(start())
    await screen.findByText('CALCULATION VERIFIED')
    await user.selectOptions(screen.getByLabelText('Number of queues'), '1')
    expect(start()).toBeDisabled()
    expect(screen.getByLabelText('P1 queue assignment')).toHaveValue('2')
    expect(screen.getByLabelText('P1 queue assignment')).toHaveAccessibleDescription('Choose an existing configured queue.')
    for (let id = 1; id <= 5; id++) await user.selectOptions(screen.getByLabelText(`P${id} queue assignment`), '1')
    expect(start()).toBeEnabled()
    await user.click(start())
    await screen.findByText('CALCULATION VERIFIED')
  })

  it('configures feedback presets, RR levels, aging and boosting and supports non-RR intermediate policies', async () => {
    const user = openCalculator()
    await loadLecture(user, 27)
    await user.click(screen.getByRole('button', { name: 'RR 1 / RR 2 / SJF' }))
    expect(screen.getByLabelText('Queue 1 time quantum')).toHaveValue(1)
    expect(screen.getByLabelText('Queue 2 time quantum')).toHaveValue(2)
    await user.click(screen.getByLabelText('Enable waiting-time aging'))
    await replace(user, 'Aging interval', '4')
    await user.click(screen.getByLabelText('Enable periodic priority boosting'))
    await replace(user, 'Priority boost interval', '10')
    await user.selectOptions(screen.getByLabelText('Number of queue levels'), '4')
    expect(screen.getByLabelText('Queue 3 scheduling policy')).toHaveValue('SJF')
    expect(screen.getByLabelText('Queue 3 scheduling policy')).toHaveAttribute('aria-invalid', 'false')
    expect(start()).toBeEnabled()
    await user.selectOptions(screen.getByLabelText('Queue 3 scheduling policy'), 'RR')
    await replace(user, 'Queue 3 time quantum', '3')
    expect(start()).toBeEnabled()
    await user.click(start())
    await screen.findByText('CALCULATION VERIFIED')
    expect(resultValues('P1')[1]).toBe('4')
  })

  it('generates a valid priority crew within user bounds and immediately schedules it', async () => {
    const user = openCalculator('/calculator?algorithm=NPP')
    await user.click(screen.getByText('Random crew settings'))
    await replace(user, 'Number of processes', '3')
    await replace(user, 'Maximum arrival time', '0')
    await replace(user, 'Maximum burst time', '1')
    await replace(user, 'Minimum process priority', '7')
    await replace(user, 'Maximum process priority', '7')
    await user.click(screen.getByRole('button', { name: 'GENERATE RANDOM CREW' }))
    for (let id = 1; id <= 3; id++) {
      expect(screen.getByLabelText(`P${id} arrival time`)).toHaveValue(0)
      expect(screen.getByLabelText(`P${id} burst time`)).toHaveValue(1)
      expect(screen.getByLabelText(`P${id} priority`)).toHaveValue(7)
    }
    await user.click(start())
    await screen.findByText('CALCULATION VERIFIED')
    expect([1, 2, 3].map(id => resultValues(`P${id}`)[2])).toEqual(['1', '2', '3'])
  })

  it('defensively rejects invalid submission and provides associated inline errors', async () => {
    const run = vi.spyOn(client, 'runSimulation')
    const user = openCalculator('/calculator?algorithm=RR')
    await user.type(screen.getByLabelText('P1 arrival time'), '-1')
    await user.type(screen.getByLabelText('P1 burst time'), '0')
    await replace(user, 'Time quantum q', '0')
    expect(start()).toBeDisabled()
    expect(screen.getByLabelText('P1 arrival time')).toHaveAccessibleDescription(/non-negative/)
    fireEvent.submit(screen.getByRole('form', { name: 'CPU scheduling calculator' }))
    expect(run).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Simulation failed')
    expect(screen.getByText('No calculated results')).toBeInTheDocument()
  })

  it('labels previous results outdated, recalculates edited inputs, and retains the new report during navigation', async () => {
    const user = openCalculator()
    await loadLecture(user, 6)
    await user.click(screen.getByRole('button', { name: 'Play' }))
    await replace(user, 'P1 burst time', '5')
    expect(screen.getByText('OUTDATED REPORT')).toBeInTheDocument()
    expect(screen.getByText('OUTDATED TIMELINE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export SVG' })).toBeDisabled()
    expect(resultValues('P1', true)[1]).toBe('4')
    expect(screen.queryByText('CALCULATION VERIFIED')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'RECALCULATE' }))
    await screen.findByText('CALCULATION VERIFIED')
    expect(resultValues('P1')[2]).toBe('12')
    expect(screen.getByLabelText('Seek simulation time')).toHaveValue('0')
    expect(screen.queryByText('OUTDATED TIMELINE')).not.toBeInTheDocument()
    const nav = within(screen.getByRole('navigation', { name: 'Main navigation' }))
    await user.click(nav.getByRole('link', { name: 'Dashboard' }))
    await user.click(nav.getByRole('link', { name: 'Calculator' }))
    expect(resultValues('P1')[1]).toBe('5')
    expect(screen.getByText('CALCULATION VERIFIED')).toBeInTheDocument()
  })

  it('shows engine errors without storing a successful result', async () => {
    vi.spyOn(client, 'runSimulation').mockRejectedValueOnce(new Error('Engine rejected this mission.'))
    const user = openCalculator()
    await user.click(screen.getByRole('button', { name: 'LOAD EXAMPLE' }))
    await user.click(start())
    expect(await screen.findByRole('alert')).toHaveTextContent('Engine rejected this mission.')
    expect(screen.getByRole('status', { name: 'Calculation status' })).toHaveTextContent('No new successful calculation')
    expect(screen.getByText('No calculated results')).toBeInTheDocument()
  })

  it('rejects inconsistent worker results before displaying success', async () => {
    vi.spyOn(client, 'runSimulation').mockImplementationOnce(async request => {
      const result = executeSimulation(request)
      return { ...result, metrics: { ...result.metrics, averageWaitingTime: -1 } }
    })
    const user = openCalculator()
    await user.click(screen.getByRole('button', { name: 'LOAD EXAMPLE' }))
    await user.click(start())
    expect(await screen.findByRole('alert')).toHaveTextContent('Simulation failed')
    expect(screen.queryByText('CALCULATION VERIFIED')).not.toBeInTheDocument()
  })

  it('aborts a pending calculation on edits and discards a late response for older inputs', async () => {
    let resolve!: (result: SchedulingResult) => void
    let pending!: SchedulingRequest
    let signal!: AbortSignal
    vi.spyOn(client, 'runSimulation').mockImplementationOnce((request, abortSignal) => {
      pending = request; signal = abortSignal
      return new Promise(done => { resolve = done })
    })
    const user = openCalculator()
    await user.click(screen.getByRole('button', { name: 'LOAD EXAMPLE' }))
    await user.click(start())
    expect(start()).toBeDisabled()
    await replace(user, 'P1 burst time', '6')
    expect(signal.aborted).toBe(true)
    await act(async () => resolve(executeSimulation(pending)))
    expect(screen.getByText('No calculated results')).toBeInTheDocument()
    expect(screen.queryByText('CALCULATION VERIFIED')).not.toBeInTheDocument()
    expect(start()).toBeEnabled()
    await user.click(start())
    await screen.findByText('CALCULATION VERIFIED')
    expect(resultValues('P1')[1]).toBe('6')
  })
})
