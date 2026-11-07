import { schedule } from '../engine/scheduler'
import type { SchedulingRequest } from '../utils/calculator'
import { assertResultConsistent } from '../utils/resultConsistency'

export function executeSimulation(request: SchedulingRequest) {
  const result = schedule(request.processes, request.config)
  assertResultConsistent(result, request)
  return result
}
