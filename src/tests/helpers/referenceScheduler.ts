import type { SchedulingProcess } from '../../types/scheduling'

/** Deliberately simple one-unit-at-a-time oracle, independent of the event kernel. */
export function referenceTimeline(input: readonly SchedulingProcess[], algorithm: string, quantum = 2) {
  const processes = [...input].sort((a, b) => a.arrivalTime - b.arrivalTime || a.originalInputOrder - b.originalInputOrder)
  const remaining = new Map(processes.map(process => [process.id, process.burstTime]))
  const ready: SchedulingProcess[] = []
  const timeline: (string | null)[] = []
  let current: SchedulingProcess | undefined
  let budget = 0
  let time = 0
  const rank = (a: SchedulingProcess, b: SchedulingProcess) => {
    const difference = algorithm === 'SJF' ? a.burstTime - b.burstTime
      : algorithm === 'SRTF' ? remaining.get(a.id)! - remaining.get(b.id)!
        : algorithm === 'NPP' || algorithm === 'PP' ? a.priority! - b.priority! : 0
    return difference || a.arrivalTime - b.arrivalTime || a.originalInputOrder - b.originalInputOrder
  }
  while ([...remaining.values()].some(value => value > 0)) {
    ready.push(...processes.filter(process => process.arrivalTime === time))
    if (algorithm === 'RR' && current && budget === 0) { ready.push(current); current = undefined }
    if (current && ready.length > 0 && (algorithm === 'SRTF' || algorithm === 'PP')) {
      const best = [...ready].sort(rank)[0]
      const preempt = algorithm === 'SRTF' ? remaining.get(best.id)! < remaining.get(current.id)! : best.priority! < current.priority!
      if (preempt) { ready.push(current); current = undefined }
    }
    if (!current && ready.length > 0) {
      if (algorithm !== 'RR') ready.sort(rank)
      current = ready.shift()!
      budget = quantum
    }
    timeline.push(current?.id ?? null)
    if (current) {
      remaining.set(current.id, remaining.get(current.id)! - 1)
      budget--
      if (remaining.get(current.id) === 0) current = undefined
    }
    time++
    if (time > 10_000) throw new Error('Reference oracle only supports small test workloads.')
  }
  return timeline
}
