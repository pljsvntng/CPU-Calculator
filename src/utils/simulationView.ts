import type { SchedulingResult } from '../types/scheduling'
import { getCrewColor } from '../data/crew'
import { lastIndexAtOrBefore } from './ganttScale'

export function processColorIndex(id: string) {
  const number = /^P([1-9]\d*)$/.exec(id)
  if (number && Number.isSafeInteger(Number(number[1]))) return Number(number[1])
  let hash = 0
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return hash % 20 + 1
}
export const processColor = (id: string) => getCrewColor(processColorIndex(id))

export function segmentDetails(result: SchedulingResult) {
  const remaining = new Map(result.processes.map(p => [p.id, p.burstTime]))
  return result.segments.map((segment, index) => {
    if (segment.processId) remaining.set(segment.processId, remaining.get(segment.processId)! - segment.duration)
    return { ...segment, index, remainingAfter: segment.processId ? remaining.get(segment.processId)! : null,
      process: result.processes.find(p => p.id === segment.processId) }
  })
}
export type SegmentDetails = ReturnType<typeof segmentDetails>[number]

/** Queue ordering comes only from engine snapshots, including same-time steps. */
export function simulationView(result: SchedulingResult, time: number, eventIndex: number) {
  const event = result.events[eventIndex]
  const runningId = event?.runningProcessId ?? null
  const elapsed = event ? Math.max(0, time - event.timestamp) : 0
  const remaining = new Map(event?.remainingBurstTimes.map(p => [p.processId, p.remainingTime]) ?? [])
  if (runningId && elapsed > 0) remaining.set(runningId, Math.max(0, remaining.get(runningId)! - elapsed))
  const processes = result.processes.map(process => ({ ...process,
    remaining: remaining.get(process.id) ?? process.burstTime,
    state: !remaining.has(process.id) ? 'not-arrived' : remaining.get(process.id) === 0 ? 'completed' : runningId === process.id ? 'running'
      : event?.readyQueues.some(q => q.processIds.includes(process.id)) ? 'waiting' : 'transition',
  }))
  const candidate = lastIndexAtOrBefore(result.segments, time, segment => segment.startTime)
  const segment = result.segments[candidate]
  const activeIndex = segment && time < segment.endTime && (segment.isIdle ? event?.type === 'cpu-idle' : segment.processId === runningId) ? candidate : -1
  return { event, runningId, processes, activeIndex, readyQueues: event?.readyQueues ?? [],
    completed: processes.filter(p => p.state === 'completed'),
  }
}
