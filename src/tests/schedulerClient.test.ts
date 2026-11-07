import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runSimulation } from '../services/schedulerClient'
import { executeSimulation } from '../services/simulationTask'
import type { SchedulingRequest } from '../utils/calculator'

const request: SchedulingRequest = {
  config: { algorithm: 'FCFS' },
  processes: [{ id: 'P1', arrivalTime: 0, burstTime: 2, originalInputOrder: 0 }],
}
class WorkerDouble {
  static latest: WorkerDouble
  onmessage: ((event: { data: unknown }) => void) | null = null
  onerror: (() => void) | null = null
  onmessageerror: (() => void) | null = null
  terminate = vi.fn()
  postMessage = vi.fn()
  url: URL
  options: WorkerOptions
  constructor(url: URL, options: WorkerOptions) {
    this.url = url; this.options = options; WorkerDouble.latest = this
  }
}
beforeEach(() => vi.stubGlobal('Worker', WorkerDouble))
afterEach(() => vi.unstubAllGlobals())

describe('simulation worker transport', () => {
  it('uses the module worker and returns real task output, terminating after completion', async () => {
    const pending = runSimulation(request, new AbortController().signal)
    const worker = WorkerDouble.latest
    expect(worker.url.pathname).toMatch(/scheduler\.worker\.ts$/)
    expect(worker.options.type).toBe('module')
    expect(worker.postMessage).toHaveBeenCalledWith(request)
    const output = executeSimulation(request)
    worker.onmessage!({ data: { type: 'success', result: output } })
    expect(await pending).toEqual(output)
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  it('propagates engine rejection from the worker and terminates', async () => {
    const pending = runSimulation(request, new AbortController().signal)
    const rejected = expect(pending).rejects.toThrow('Rejected input')
    WorkerDouble.latest.onmessage!({ data: { type: 'error', message: 'Rejected input' } })
    await rejected
    expect(WorkerDouble.latest.terminate).toHaveBeenCalledOnce()
  })

  it.each(['onerror', 'onmessageerror'] as const)('handles %s without leaving a running worker', async event => {
    const pending = runSimulation(request, new AbortController().signal)
    const rejected = expect(pending).rejects.toThrow(/could not/)
    WorkerDouble.latest[event]!()
    await rejected
    expect(WorkerDouble.latest.terminate).toHaveBeenCalledOnce()
  })

  it('terminates a cancelled job and removes the abort listener on success', async () => {
    const controller = new AbortController()
    const pending = runSimulation(request, controller.signal)
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()
    await rejected
    expect(WorkerDouble.latest.terminate).toHaveBeenCalledOnce()
    const next = new AbortController()
    const completed = runSimulation(request, next.signal)
    WorkerDouble.latest.onmessage!({ data: { type: 'success', result: executeSimulation(request) } })
    await completed
    next.abort()
    expect(WorkerDouble.latest.terminate).toHaveBeenCalledOnce()
  })

  it('rejects an already-aborted job before constructing another worker', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(runSimulation(request, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('runs the same verified task in environments without Worker', async () => {
    vi.stubGlobal('Worker', undefined)
    const result = await runSimulation(request, new AbortController().signal)
    expect(result.processes[0].completionTime).toBe(2)
    expect(result.metrics.averageWaitingTime).toBe(0)
  })
})
