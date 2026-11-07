import type { GanttSegment, ScheduledProcess, SchedulingMetrics } from '../types/scheduling'

/** Inputs have already passed the engine's exact-integer range validation. */
export function calculateMetrics(processes: readonly ScheduledProcess[], segments: readonly GanttSegment[]): SchedulingMetrics {
  const count = processes.length
  const totalBusyTime = processes.reduce((sum, process) => sum + process.executedTime, 0)
  const totalIdleTime = segments.reduce((sum, segment) => sum + (segment.isIdle ? segment.duration : 0), 0)
  const totalObservedTime = segments.at(-1)!.endTime
  return {
    averageTurnaroundTime: processes.reduce((sum, process) => sum + process.turnaroundTime, 0) / count,
    averageWaitingTime: processes.reduce((sum, process) => sum + process.waitingTime, 0) / count,
    averageResponseTime: processes.reduce((sum, process) => sum + process.responseTime, 0) / count,
    totalBusyTime, totalIdleTime,
    observationStartTime: 0, observationEndTime: totalObservedTime, totalObservedTime,
    cpuUtilization: totalBusyTime / totalObservedTime * 100,
    throughput: count / totalObservedTime,
    completedProcesses: count,
  }
}
