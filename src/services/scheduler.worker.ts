import { executeSimulation } from './simulationTask'
import type { SchedulingRequest } from '../utils/calculator'

self.onmessage = (event: MessageEvent<SchedulingRequest>) => {
  try { self.postMessage({ type: 'success', result: executeSimulation(event.data) }) }
  catch (error) { self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Simulation failed.' }) }
}
