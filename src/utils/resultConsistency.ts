import type { SchedulingResult } from '../types/scheduling'
import type { SchedulingRequest } from './calculator'
import { calculateMetrics } from './metrics'

/** Verify engine output before presenting success; this does not schedule work. */
export function assertResultConsistent(result: SchedulingResult, request: SchedulingRequest): void {
  const fail = () => { throw new Error('The engine returned an inconsistent result. No new successful report was stored.') }
  if (result.algorithm !== request.config.algorithm || result.processes.length !== request.processes.length || !result.segments.length) fail()
  const totals = new Map(request.processes.map(process => [process.id, { input: process, executed: 0, start: -1, end: -1 }]))
  let time = 0
  for (const segment of result.segments) {
    if (segment.startTime !== time || !Number.isSafeInteger(segment.endTime) || segment.endTime <= time || segment.duration !== segment.endTime - time) fail()
    if (segment.isIdle) { if (segment.processId !== null) fail() }
    else {
      const data = totals.get(segment.processId!)
      if (!data || segment.startTime < data.input.arrivalTime) fail()
      data!.executed += segment.duration
      if (data!.start < 0) data!.start = time
      data!.end = segment.endTime
    }
    time = segment.endTime
  }
  const seen = new Set<string>()
  for (const process of result.processes) {
    const data = totals.get(process.id)
    if (!data || seen.has(process.id)) fail()
    seen.add(process.id)
    const original = data!.input
    if (process.arrivalTime !== original.arrivalTime || process.burstTime !== original.burstTime || data!.executed !== original.burstTime || process.executedTime !== original.burstTime || process.remainingTime !== 0 || process.completionTime !== data!.end || process.firstStartTime !== data!.start || process.turnaroundTime !== data!.end - original.arrivalTime || process.waitingTime !== process.turnaroundTime - original.burstTime || process.responseTime !== data!.start - original.arrivalTime || process.waitingTime < 0 || process.responseTime < 0) fail()
  }
  const expected = calculateMetrics(result.processes, result.segments)
  for (const key of Object.keys(expected) as (keyof typeof expected)[]) if (!Number.isFinite(result.metrics[key]) || result.metrics[key] !== expected[key]) fail()
  if (expected.totalBusyTime + expected.totalIdleTime !== time) fail()
}
