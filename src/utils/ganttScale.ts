export const GANTT_LEFT = 38
export const GANTT_RIGHT = 38
export const GANTT_Y = 78
export const GANTT_HEIGHT = 230

/** One linear scale for blocks, ticks, pointer and exports. No schedule changes. */
export function ganttScale(origin: number, end: number, width: number) {
  const left = Math.max(GANTT_LEFT, String(origin).length * 3.7 + 10)
  const right = Math.max(GANTT_RIGHT, String(end).length * 3.7 + 10)
  const plotWidth = Math.max(1, width - left - right)
  const pixelsPerUnit = plotWidth / Math.max(1, end - origin)
  return { pixelsPerUnit, left, right, x: (time: number) => left + (time - origin) * pixelsPerUnit,
    durationWidth: (duration: number) => duration * pixelsPerUnit }
}

export function ganttWidth(duration: number, available: number, zoom: number, fit: boolean, segmentCount = 0, minimumUnitWidth = 56) {
  const minimum = Math.max(280, available)
  // Unit cells remain readable even in Fit mode. Long charts use bounded time windows.
  const unit = Math.max(minimumUnitWidth, fit ? 56 : 64 * zoom)
  const natural = Math.max(minimum, duration * unit + GANTT_LEFT + GANTT_RIGHT, segmentCount ? 0 : minimum)
  return Math.min(384_000, natural)
}

/** Hide colliding text without moving its actual time coordinate. */
export function visibleTimeLabels(times: number[], x: (time: number) => number) {
  const visible = new Set<number>()
  if (!times.length) return visible
  visible.add(times[0])
  let right = x(times[0]) + String(times[0]).length * 3.7
  const last = times.at(-1)!
  const lastLeft = x(last) - String(last).length * 3.7
  for (const time of times.slice(1, -1)) {
    const half = String(time).length * 3.7
    if (x(time) - half > right + 12 && x(time) + half < lastLeft - 12) {
      visible.add(time); right = x(time) + half
    }
  }
  visible.add(last)
  return visible
}

export function lastIndexAtOrBefore<T>(items: readonly T[], time: number, timestamp: (item: T) => number) {
  let low = 0, high = items.length - 1, found = -1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (timestamp(items[middle]) <= time) { found = middle; low = middle + 1 }
    else high = middle - 1
  }
  return found
}
