import type { SchedulingResult } from '../types/scheduling'
import { lastIndexAtOrBefore } from './ganttScale'
import type { SegmentDetails } from './simulationView'

export const UNIT_WINDOW_SIZE = 2048
export const MIN_UNIT_PIXELS = 64
export type UnitSegment = SegmentDetails & { sourceIndex: number }

/** Decimal subtraction without cumulative floating-point additions or endpoint rounding. */
function difference(end: number, start: number) {
  if (Number.isInteger(end) && Number.isInteger(start)) return end - start
  const decimal = (value: number) => {
    const [mantissa, exponent = '0'] = value.toString().split('e')
    const [whole, fraction = ''] = mantissa.split('.')
    return { integer: BigInt(whole + fraction), places: fraction.length - Number(exponent) }
  }
  const a = decimal(end), b = decimal(start), places = Math.max(a.places, b.places)
  const integer = a.integer * 10n ** BigInt(places - a.places) - b.integer * 10n ** BigInt(places - b.places)
  return Number(`${integer}e${-places}`)
}

/** Lazy visual index. Memory depends on dispatch count, never on total CPU time. */
export function unitTimeline(result: SchedulingResult) {
  const processes = new Map(result.processes.map(process => [process.id, process]))
  const remaining = new Map(result.processes.map(process => [process.id, process.burstTime]))
  const sources: SegmentDetails[] = result.segments.map((source, index) => {
    if (!Number.isFinite(source.startTime) || !Number.isFinite(source.endTime) || source.endTime < source.startTime) throw new RangeError('Gantt intervals require finite, ordered endpoints.')
    let remainingAfter: number | null = null
    if (source.processId) {
      remainingAfter = difference(remaining.get(source.processId)!, difference(source.endTime, source.startTime))
      remaining.set(source.processId, remainingAfter)
    }
    return { ...source, index, remainingAfter, process: source.processId ? processes.get(source.processId) : undefined }
  }).filter(source => source.endTime > source.startTime)
  const offsets: number[] = []
  let count = 0
  for (const source of sources) {
    offsets.push(count)
    count += Math.ceil(source.endTime) - Math.floor(source.startTime)
    if (!Number.isSafeInteger(count)) throw new RangeError('The visual unit count exceeds the exact integer range.')
  }
  const at = (index: number): UnitSegment | undefined => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= count) return undefined
    const sourceIndex = lastIndexAtOrBefore(offsets, index, value => value)
    const source = sources[sourceIndex], tick = Math.floor(source.startTime) + (index - offsets[sourceIndex])
    const startTime = Math.max(source.startTime, tick), endTime = Math.min(source.endTime, tick + 1)
    // Subtract work already done within this dispatch; the source snapshot stays immutable.
    const remainingAfter = source.remainingAfter === null ? null : difference(source.remainingAfter, -difference(source.endTime, endTime))
    return { ...source, index, sourceIndex: source.index, startTime, endTime, duration: difference(endTime, startTime), remainingAfter: remainingAfter }
  }
  const indexAtTime = (time: number) => {
    if (!count) return -1
    const sourceIndex = Math.max(0, lastIndexAtOrBefore(sources, time, source => source.startTime))
    const source = sources[sourceIndex]
    const offset = Math.max(0, Math.min(Math.ceil(source.endTime) - Math.floor(source.startTime) - 1, Math.floor(time) - Math.floor(source.startTime)))
    return offsets[sourceIndex] + offset
  }
  const slice = (start: number, end: number) => {
    const cells: UnitSegment[] = []
    for (let index = Math.max(0, start); index < Math.min(count, end); index++) cells.push(at(index)!)
    return cells
  }
  return { count, at, indexAtTime, slice }
}
export type UnitTimeline = ReturnType<typeof unitTimeline>
export function unitWindow(timeline: UnitTimeline, page: number) {
  const first = Math.min(Math.max(0, page) * UNIT_WINDOW_SIZE, Math.max(0, timeline.count - 1))
  const last = Math.min(timeline.count, first + UNIT_WINDOW_SIZE)
  return { first, last, startTime: timeline.at(first)?.startTime ?? 0, endTime: timeline.at(last - 1)?.endTime ?? 0 }
}
