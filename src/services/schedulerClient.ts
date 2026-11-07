import type { SchedulingRequest } from '../utils/calculator'
import type { SchedulingResult } from '../types/scheduling'
import { executeSimulation } from './simulationTask'

export async function runSimulation(request: SchedulingRequest, signal: AbortSignal): Promise<SchedulingResult> {
  if (signal.aborted) throw new DOMException('Simulation cancelled.', 'AbortError')
  // The fallback also supports tests and environments without Web Workers.
  if (typeof Worker === 'undefined') return Promise.resolve().then(() => {
    if (signal.aborted) throw new DOMException('Simulation cancelled.', 'AbortError')
    return executeSimulation(request)
  })
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./scheduler.worker.ts', import.meta.url), { type: 'module' })
    const finish = () => { worker.terminate(); signal.removeEventListener('abort', cancel) }
    const cancel = () => { finish(); reject(new DOMException('Simulation cancelled.', 'AbortError')) }
    signal.addEventListener('abort', cancel, { once: true })
    worker.onmessage = (event: MessageEvent<{ type: 'success'; result: SchedulingResult } | { type: 'error'; message: string }>) => {
      finish()
      if (event.data.type === 'success') resolve(event.data.result)
      else reject(new Error(event.data.message))
    }
    worker.onerror = () => { finish(); reject(new Error('The simulation worker could not run. Please retry the calculation.')) }
    worker.onmessageerror = () => { finish(); reject(new Error('The simulation response could not be read. Please retry.')) }
    try { worker.postMessage(request) }
    catch (error) { finish(); reject(error) }
  })
}
