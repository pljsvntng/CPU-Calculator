import { demotionDescription } from './feedbackRules'
import type { QueuePolicy, SchedulingEvent, SchedulingResult } from '../types/scheduling'

function policyRule(policy: QueuePolicy, direction: 'lower-first' | 'higher-first') {
  switch (policy.algorithm) {
    case 'FCFS': return 'FCFS orders ready processes by arrival time, then original input order.'
    case 'SJF': return 'SJF selects the shortest available burst. Within this queue, its selected turn is non-preemptive; ties use arrival time and original input order.'
    case 'NPP': return `NPP uses ${direction === 'lower-first' ? 'lower' : 'higher'} numbers as higher priority. Within this queue it is non-preemptive; priority ties use arrival time, then original input order.`
    case 'SRTF': return 'Within this queue, SRTF compares remaining CPU time. A strictly shorter remaining burst can preempt; equal remaining times retain the running process. Interqueue rules, when configured, apply separately.'
    case 'PP': return `Within this queue, PP uses ${direction === 'lower-first' ? 'lower' : 'higher'} numbers as higher priority. Only a strictly better priority can preempt; equal-priority arrivals do not preempt. Interqueue rules, when configured, apply separately.`
    case 'RR': return `RR quantum = ${policy.quantum} CPU units. It rotates the FIFO ready queue; arrivals at a turn boundary enter before the unfinished process is requeued.`
  }
}
export function explainEvent(result: SchedulingResult, index: number) {
  const event = result.events[index]
  if (!event) return null
  const config = result.config
  const ended = ['process-completed', 'process-preempted', 'cpu-budget-exhausted', 'quantum-expired', 'process-demoted'].includes(event.type)
  const interval = result.segments.find(segment => ended
    ? segment.processId === event.processId && segment.endTime === event.timestamp
    : segment.startTime <= event.timestamp && event.timestamp < segment.endTime && (segment.isIdle ? event.type === 'cpu-idle' : segment.processId === event.runningProcessId))
  let policy: QueuePolicy | undefined
  const notes: string[] = []
  const direction = 'priorityDirection' in config ? config.priorityDirection ?? 'lower-first' : 'lower-first'
  if (config.algorithm === 'MLQ') {
    const queue = config.queues.find(queue => queue.level === interval?.queueLevel)
    policy = queue?.policy
    notes.push(`MLQ has fixed queue membership: ${config.queues.map(queue => `Q${queue.level} priority ${queue.priority}, ${queue.policy.algorithm}${queue.policy.algorithm === 'RR' ? ` q=${queue.policy.quantum}` : ''}`).join('; ')}. Smaller queue-priority numbers run first; equal queue priorities use the smaller level.`)
    notes.push(config.interqueuePreemption === false ? 'Interqueue preemption is deferred until the current scheduling boundary. Same-queue SRTF/PP rules still apply.' : 'A higher-priority ready queue may interrupt a lower-priority queue. Same-queue policy rules still apply.')
  } else if (config.algorithm === 'MLFQ') {
    policy = config.levels.find(queue => queue.level === interval?.queueLevel)?.policy
    notes.push(`MLFQ levels: ${config.levels.map(level => `Q${level.level}: ${level.policy.algorithm}${level.policy.algorithm === 'RR' ? ` q=${level.policy.quantum}` : ''}`).join('; ')}.`)
    notes.push('Each queue applies its configured demotion rule. RR defaults to full-quantum demotion, which demotes one level; non-RR defaults to none. Service budgets accumulate CPU time, not waiting time. Dispatch limits are checked when a turn ends. Interrupted budgets are retained; promotion and boost reset them. The last level requeues instead of demoting.')
    for (const level of config.levels) notes.push(`Q${level.level}: ${demotionDescription(level)}.`)
    notes.push(config.interqueuePreemption === false ? 'Interqueue interruption is deferred until the active scheduling boundary.' : 'Higher-priority queues can interrupt lower levels.')
    if (config.agingInterval) notes.push(`Configured waiting-time aging interval: ${config.agingInterval}. Actual promotions appear as process-promoted events.`)
    if (config.boostInterval) notes.push(`Configured priority boost interval: ${config.boostInterval}. Actual boosts appear as priority-boost events.`)
  } else policy = config.algorithm === 'RR' ? { algorithm: 'RR', quantum: config.quantum } : { algorithm: config.algorithm }
  if (policy) notes.push(policyRule(policy, direction))
  const candidates = new Set([event.processId, event.runningProcessId, ...event.readyQueues.flatMap(queue => queue.processIds)].filter((id): id is string => !!id))
  const facts = result.processes.filter(process => candidates.has(process.id)).map(process => ({
    id: process.id, arrival: process.arrivalTime, burst: process.burstTime, priority: process.priority,
    remaining: event.remainingBurstTimes.find(item => item.processId === process.id)?.remainingTime,
  }))
  if (event.type === 'process-selected') {
    const chosen = facts.find(process => process.id === event.processId)
    if (chosen) notes.push(`Recorded selection inputs for ${chosen.id}: AT=${chosen.arrival}, BT=${chosen.burst}${chosen.remaining === undefined ? '' : `, remaining=${chosen.remaining}`}${chosen.priority === undefined ? '' : `, priority=${chosen.priority}`}. The selected process has already left the ready-queue snapshot at this step; compare its values with the other available processes shown above.`)
  }
  return { event, interval, intervalRelation: ended ? 'Interval ending at this event' : 'Interval containing this event after dispatch',
    arrived: event.remainingBurstTimes.map(process => process.processId), facts, notes, next: result.events[index + 1] ?? null,
  }
}
export const eventLabel = (event: SchedulingEvent) => `${event.type.replaceAll('-', ' ')}${event.processId ? ` · ${event.processId}` : ''}`
