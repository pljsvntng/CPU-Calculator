import type { SchedulingEvent, SchedulingEventType } from '../types/scheduling'
import type { RuntimeProcess, RuntimeQueue } from './policy'
import { orderedReady } from './policy'
import { SchedulingLimitError } from './errors'

/** Every snapshot is detached; later simulation mutations cannot rewrite history. */
export class EventLog {
  readonly events: SchedulingEvent[] = []
  private snapshotEntries = 0
  private maxEvents: number
  private maxSnapshotEntries: number

  constructor(maxEvents: number, maxSnapshotEntries: number) {
    this.maxEvents = maxEvents
    this.maxSnapshotEntries = maxSnapshotEntries
  }

  emit(timestamp: number, type: SchedulingEventType, processId: string | undefined, explanation: string,
    states: RuntimeProcess[], queues: RuntimeQueue[], running: RuntimeProcess | null) {
    const arrived = states.filter(process => process.arrived)
    const entries = arrived.length + queues.length + queues.reduce((sum, queue) => sum + queue.ready.length, 0)
    if (this.events.length >= this.maxEvents || this.snapshotEntries + entries > this.maxSnapshotEntries) {
      throw new SchedulingLimitError('Event log limit exceeded. Increase the explicit event/snapshot limits or use a smaller workload; no partial result is returned.')
    }
    this.snapshotEntries += entries
    this.events.push({
      sequence: this.events.length,
      timestamp, type, ...(processId === undefined ? {} : { processId }),
      runningProcessId: running?.input.id ?? null,
      readyQueues: queues.map(queue => ({ queueLevel: queue.level, processIds: orderedReady(queue).map(process => process.input.id) })),
      remainingBurstTimes: arrived.map(process => ({ processId: process.input.id, remainingTime: process.remainingTime })),
      explanation,
    })
  }
}
