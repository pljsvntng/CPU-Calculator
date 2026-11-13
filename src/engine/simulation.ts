import type { GanttSegment, SchedulingConfig, SchedulingEventType, SchedulingProcess, SchedulingResult } from '../types/scheduling'
import type { InternalSegment, RuntimeProcess, SimulationPlan } from './policy'
import { byArrival, orderedReady } from './policy'
import { EventLog } from './events'
import { DEFAULT_LIMITS } from './limits'
import { SchedulingLimitError } from './errors'
import { calculateMetrics } from '../utils/metrics'

function future(time: number, duration: number) {
  return Number.isSafeInteger(time + duration) ? time + duration : Infinity
}
function publicSegment(segment: InternalSegment): GanttSegment {
  return {
    processId: segment.processId, startTime: segment.startTime, endTime: segment.endTime,
    duration: segment.duration, isIdle: segment.isIdle,
    ...(segment.queueLevel === undefined ? {} : { queueLevel: segment.queueLevel }),
  }
}

/** Shared event-driven clock/accounting kernel. Algorithm policies live in algorithms/. */
export function simulate(processes: SchedulingProcess[], config: SchedulingConfig, plan: SimulationPlan): SchedulingResult {
  const limits = { ...DEFAULT_LIMITS, ...config.limits }
  const states: RuntimeProcess[] = processes.map(input => ({
    input, remainingTime: input.burstTime, firstStartTime: null, completionTime: null, executedTime: 0,
    currentQueueLevel: input.queueLevel ?? 1, arrived: false, readySince: input.arrivalTime,
    budgetRemaining: null, serviceRemaining: null, levelDispatches: 0, queueEntryTime: input.arrivalTime, executionHistory: [],
  }))
  const arrivals = [...states].sort(byArrival)
  const byId = new Map(states.map(process => [process.input.id, process]))
  const queueByLevel = new Map(plan.queues.map(queue => [queue.level, queue]))
  const feedback = config.algorithm === 'MLFQ' ? config : undefined
  const promotions = [...(feedback?.priorityPromotions ?? [])].map((promotion, index) => ({ ...promotion, index }))
    .sort((a, b) => a.time - b.time || a.index - b.index)
  const log = new EventLog(limits.maxEvents, limits.maxSnapshotEntries)
  const segments: InternalSegment[] = []
  let time = 0
  let nextArrival = 0
  let nextPromotion = 0
  let nextBoost = feedback?.boostInterval ?? Infinity
  let running: RuntimeProcess | null = null
  let completed = 0
  let transitions = 0
  let dispatch = 0
  let wasIdle = false
  const includeLevels = config.algorithm === 'MLQ' || config.algorithm === 'MLFQ'

  const emit = (type: SchedulingEventType, process: RuntimeProcess | undefined, explanation: string) =>
    log.emit(time, type, process?.input.id, explanation, states, plan.queues, running)
  const enqueue = (process: RuntimeProcess, front = false) => {
    process.readySince = time
    const ready = queueByLevel.get(process.currentQueueLevel)!.ready
    if (front) ready.unshift(process)
    else ready.push(process)
  }
  const removeReady = (process: RuntimeProcess) => {
    const queue = queueByLevel.get(process.currentQueueLevel)!
    queue.ready = queue.ready.filter(item => item !== process)
  }
  const resetLevel = (process: RuntimeProcess) => {
    process.budgetRemaining = null
    process.serviceRemaining = null
    process.levelDispatches = 0
    process.queueEntryTime = time
  }
  const demote = (process: RuntimeProcess, reason: string) => {
    const target = plan.feedback?.demotionTarget(process.currentQueueLevel)
    if (target !== undefined && target !== process.currentQueueLevel) {
      const old = process.currentQueueLevel
      process.currentQueueLevel = target
      resetLevel(process)
      emit('process-demoted', process, `${process.input.id} moves from level ${old} to ${target}: ${reason}. Remaining burst: ${process.remainingTime}.`)
      return true
    }
    return false
  }
  const suspend = (reason: string) => {
    const interrupted = running!
    running = null
    emit('process-preempted', interrupted, reason)
    const rule = queueByLevel.get(interrupted.currentQueueLevel)!.demotion
    const moved = rule?.kind === 'dispatches' && interrupted.levelDispatches >= rule.count
      ? demote(interrupted, `configured ${rule.count} dispatches consumed; interrupted dispatch ends`) : false
    enqueue(interrupted, !moved && queueByLevel.get(interrupted.currentQueueLevel)!.policy.algorithm === 'RR')
    emit('process-requeued', interrupted, `${interrupted.input.id} retains ${interrupted.remainingTime} CPU units${interrupted.budgetRemaining === null ? '' : ` and ${interrupted.budgetRemaining} units of its current quantum`}. CPU service budgets also retain unused time across interruptions.`)
  }
  const promote = (process: RuntimeProcess, target: number, reason: string) => {
    if (process.completionTime !== null || target >= process.currentQueueLevel) {
      emit('promotion-skipped', process, `${reason}: ${process.input.id} is complete or already at an equal/higher level.`)
      return
    }
    const oldLevel = process.currentQueueLevel
    if (running === process) {
      running = null
      emit('process-preempted', process, `${reason}: the running turn ends for promotion.`)
    } else removeReady(process)
    process.currentQueueLevel = target
    resetLevel(process)
    enqueue(process)
    emit('process-promoted', process, `${reason}: ${process.input.id} moves from level ${oldLevel} to ${target} with a fresh level budget.`)
  }
  const append = (process: RuntimeProcess | null, endTime: number) => {
    const slice: InternalSegment = {
      processId: process?.input.id ?? null, startTime: time, endTime,
      duration: endTime - time, isIdle: process === null,
      ...(process && includeLevels ? { queueLevel: process.currentQueueLevel } : {}),
      dispatch: process ? dispatch : -1,
    }
    const add = (target: InternalSegment[]) => {
      const previous = target.at(-1)
      if (previous && previous.dispatch === slice.dispatch && previous.processId === slice.processId && previous.queueLevel === slice.queueLevel && previous.endTime === time) {
        previous.endTime = endTime
        previous.duration += slice.duration
      } else {
        if (target === segments && segments.length >= limits.maxSegments) throw new SchedulingLimitError('Gantt segment limit exceeded; no partial schedule is returned.')
        target.push({ ...slice })
      }
    }
    add(segments)
    if (process) add(process.executionHistory)
  }

  while (completed < states.length) {
    if (++transitions > limits.maxTransitions) throw new SchedulingLimitError('Simulation transition limit exceeded; no partial schedule is returned.')
    // At the same timestamp: completion, arrivals, quantum handling, explicit
    // promotions, aging, boosts, preemption, dispatch. See engine/README.md.
    if (running && running.remainingTime === 0) {
      const finished = running
      finished.completionTime = time
      running = null
      completed++
      emit('process-completed', finished, `${finished.input.id} completes at time ${time}; all ${finished.executedTime} CPU units have executed.`)
    }
    if (completed === states.length) break
    while (nextArrival < arrivals.length && arrivals[nextArrival].input.arrivalTime === time) {
      const process = arrivals[nextArrival++]
      process.arrived = true
      enqueue(process)
      emit('process-arrived', process, `${process.input.id} arrives at time ${time} and enters level ${process.currentQueueLevel}.`)
    }
    if (running && (running.budgetRemaining === 0 || running.serviceRemaining === 0)) {
      const expired = running
      running = null
      const quantumExpired = expired.budgetRemaining === 0
      const serviceExpired = expired.serviceRemaining === 0
      const rule = queueByLevel.get(expired.currentQueueLevel)!.demotion
      if (quantumExpired) emit('quantum-expired', expired, `${expired.input.id} exhausts its level ${expired.currentQueueLevel} quantum with ${expired.remainingTime} units left.`)
      if (serviceExpired) emit('cpu-budget-exhausted', expired, `${expired.input.id} exhausts its configured CPU service budget in level ${expired.currentQueueLevel}.`)
      const reason = serviceExpired ? 'CPU service budget exhausted'
        : rule?.kind === 'quantum' ? 'full RR quantum consumed'
        : rule?.kind === 'dispatches' && expired.levelDispatches >= rule.count ? `${rule.count} dispatches consumed` : null
      const moved = reason ? demote(expired, reason) : false
      if (serviceExpired && !moved) expired.queueEntryTime = time
      expired.budgetRemaining = null
      if (serviceExpired) expired.serviceRemaining = null
      enqueue(expired)
      emit('process-requeued', expired, `${expired.input.id} rejoins the tail of level ${expired.currentQueueLevel} after all arrivals at time ${time}.`)
    }
    while (nextPromotion < promotions.length && promotions[nextPromotion].time === time) {
      const promotion = promotions[nextPromotion++]
      promote(byId.get(promotion.processId)!, promotion.targetQueueLevel, 'Configured priority promotion')
    }
    if (feedback?.agingInterval) {
      const eligible = plan.queues.flatMap(queue => queue.ready)
        .filter(process => process.currentQueueLevel > 1 && time - process.readySince >= feedback.agingInterval!)
        .sort((a, b) => a.input.originalInputOrder - b.input.originalInputOrder)
      for (const process of eligible) promote(process, plan.feedback!.agingTarget(process.currentQueueLevel), 'Waiting-time aging')
    }
    if (time === nextBoost && feedback?.boostInterval) {
      const active = plan.feedback!.boostOrder(plan.queues, running)
      const interrupted = running
      running = null
      if (interrupted) emit('process-preempted', interrupted, 'Periodic priority boost ends the current turn and resets all level budgets.')
      for (const queue of plan.queues) queue.ready = []
      for (const process of active) {
        const oldLevel = process.currentQueueLevel
        process.currentQueueLevel = plan.feedback!.topLevel
        resetLevel(process)
        enqueue(process)
        if (oldLevel > 1) emit('process-promoted', process, `Periodic boost moves ${process.input.id} from level ${oldLevel} to level 1.`)
      }
      emit('priority-boost', undefined, 'All arrived, unfinished processes move to level 1. Existing ready order precedes the interrupted running process; budgets reset.')
      nextBoost = future(time, feedback.boostInterval)
    }

    const bestQueue = plan.queues.find(queue => queue.ready.length > 0)
    if (running && bestQueue) {
      const runningQueue = queueByLevel.get(running.currentQueueLevel)!
      const higherQueue = plan.queues.indexOf(bestQueue) < plan.queues.indexOf(runningQueue)
      if (higherQueue && plan.interqueuePreemption) suspend(`A ready process in higher-priority level ${bestQueue.level} preempts ${running.input.id}.`)
      else if (runningQueue.ready.length > 0 && runningQueue.policy.shouldPreempt(orderedReady(runningQueue)[0], running)) {
        suspend(`A strictly better ${runningQueue.policy.algorithm} candidate preempts ${running.input.id}. Equal-ranked arrivals do not preempt.`)
      }
    }
    if (!running) {
      const queue = plan.queues.find(item => item.ready.length > 0)
      if (queue) {
        running = orderedReady(queue)[0]
        removeReady(running)
        const first = running.firstStartTime === null
        if (first) running.firstStartTime = time
        if (running.budgetRemaining === null && queue.policy.quantum !== undefined) running.budgetRemaining = queue.policy.quantum
        if (running.serviceRemaining === null && queue.demotion?.kind === 'service') running.serviceRemaining = queue.demotion.budget
        running.levelDispatches++
        dispatch++
        wasIdle = false
        emit('process-selected', running, `${queue.policy.algorithm} selects ${running.input.id} from level ${queue.level}, using its documented tie rules.`)
        emit('process-started', running, `${running.input.id} ${first ? 'starts for the first time' : 'resumes'} at time ${time}, with ${running.remainingTime} CPU units left.`)
      }
    }
    const arrivalTime = arrivals[nextArrival]?.input.arrivalTime ?? Infinity
    const promotionTime = promotions[nextPromotion]?.time ?? Infinity
    if (!running) {
      const nextTime = Math.min(arrivalTime, promotionTime)
      if (!Number.isFinite(nextTime) || nextTime <= time) throw new Error('Scheduler invariant failed: no future work while processes remain unfinished.')
      if (!wasIdle) emit('cpu-idle', undefined, `The ready queues are empty; the CPU becomes idle at time ${time}.`)
      wasIdle = true
      append(null, nextTime)
      time = nextTime
      // Skip empty-system boost ticks without fabricating off-clock events.
      if (feedback?.boostInterval) {
        nextBoost = time % feedback.boostInterval === 0 ? time : future(time - time % feedback.boostInterval, feedback.boostInterval)
      }
      continue
    }
    let nextTime = Math.min(future(time, running.remainingTime), arrivalTime, promotionTime, nextBoost)
    if (running.budgetRemaining !== null) nextTime = Math.min(nextTime, future(time, running.budgetRemaining))
    if (running.serviceRemaining !== null) nextTime = Math.min(nextTime, future(time, running.serviceRemaining))
    if (feedback?.agingInterval) {
      for (const queue of plan.queues) for (const process of queue.ready) {
        if (process.currentQueueLevel > 1) nextTime = Math.min(nextTime, future(process.readySince, feedback.agingInterval))
      }
    }
    if (!Number.isSafeInteger(nextTime) || nextTime <= time) throw new Error('Scheduler invariant failed: time must advance by a positive safe integer.')
    const elapsed = nextTime - time
    append(running, nextTime)
    running.remainingTime -= elapsed
    running.executedTime += elapsed
    if (running.budgetRemaining !== null) running.budgetRemaining -= elapsed
    if (running.serviceRemaining !== null) running.serviceRemaining -= elapsed
    time = nextTime
  }
  const output = states.map(process => {
    const completionTime = process.completionTime!
    const firstStartTime = process.firstStartTime!
    const turnaroundTime = completionTime - process.input.arrivalTime
    return {
      ...process.input, remainingTime: process.remainingTime, firstStartTime, completionTime,
      executedTime: process.executedTime, currentQueueLevel: process.currentQueueLevel,
      executionHistory: process.executionHistory.map(publicSegment),
      turnaroundTime, waitingTime: turnaroundTime - process.input.burstTime,
      responseTime: firstStartTime - process.input.arrivalTime,
    }
  })
  const publicSegments = segments.map(publicSegment)
  return { algorithm: config.algorithm, config, processes: output, segments: publicSegments, events: log.events, metrics: calculateMetrics(output, publicSegments) }
}
