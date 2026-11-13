import type { GanttSegment, ScheduledProcess, SchedulingMetrics } from '../types/scheduling'

/** Inputs have already passed the engine's exact-integer range validation. */
export function calculateMetrics(processes: readonly ScheduledProcess[], segments: readonly GanttSegment[]): SchedulingMetrics {
  const count = processes.length
  const totalBusyTime = processes.reduce((sum, process) => sum + process.executedTime, 0)
  const totalIdleTime = segments.reduce((sum, segment) => sum + (segment.isIdle ? segment.duration : 0), 0)
  const totalObservedTime = segments.at(-1)?.endTime ?? 0
  return {
    averageTurnaroundTime: processes.reduce((sum, process) => sum + process.turnaroundTime, 0) / (count || 1),
    averageWaitingTime: processes.reduce((sum, process) => sum + process.waitingTime, 0) / (count || 1),
    averageResponseTime: processes.reduce((sum, process) => sum + process.responseTime, 0) / (count || 1),
    totalBusyTime, totalIdleTime,
    observationStartTime: 0, observationEndTime: totalObservedTime, totalObservedTime,
    cpuUtilization: totalObservedTime ? totalBusyTime / totalObservedTime * 100 : 0,
    throughput: totalObservedTime ? count / totalObservedTime : 0,
    completedProcesses: count,
  }
}
