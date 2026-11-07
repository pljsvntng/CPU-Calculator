import type { AlgorithmId } from '../types'
import type { SchedulingProcess, SchedulingResult } from '../types/scheduling'
import { runSimulation } from '../services/schedulerClient'
export const comparisonMetrics = [
  ['averageWaitingTime', 'Average WT', 'CPU units', false], ['averageTurnaroundTime', 'Average TT', 'CPU units', false],
  ['averageResponseTime', 'Average RT', 'CPU units', false], ['cpuUtilization', 'CPU utilization', '%', true],
  ['throughput', 'Throughput', 'processes / CPU unit', true], ['observationEndTime', 'Makespan', 'CPU units', false],
] as const
export type ComparisonMetric = typeof comparisonMetrics[number][0]
export interface ComparisonEntry { algorithm: AlgorithmId; result: SchedulingResult | null; error: string }
export async function compareAlgorithms(processes: SchedulingProcess[], configurations: { algorithm: AlgorithmId; json: string }[], signal: AbortSignal): Promise<ComparisonEntry[]> {
  if (configurations.length < 2 || new Set(configurations.map(c => c.algorithm)).size !== configurations.length) throw new Error('Choose at least two distinct algorithms.')
  const snapshot = structuredClone(processes)
  const entries: ComparisonEntry[] = []
  for (const item of configurations) {
    if (signal.aborted) throw new DOMException('Comparison cancelled.', 'AbortError')
    try {
      const config = JSON.parse(item.json)
      if (config?.algorithm !== item.algorithm) throw new Error('Configuration algorithm must match the selected policy.')
      if (['NPP', 'PP', 'MLQ'].includes(item.algorithm) && !['lower-first', 'higher-first'].includes(config.priorityDirection)) throw new Error('Explicit priorityDirection is required.')
      if (['MLQ', 'MLFQ'].includes(item.algorithm) && typeof config.interqueuePreemption !== 'boolean') throw new Error('Explicit interqueuePreemption is required.')
      // Queue metadata belongs to queue exercises; preserve it in the shared
      // dataset, but omit it at the single-queue engine boundary.
      const inputs = snapshot.map(p => { const { queueLevel, ...rest } = p; return ['MLQ', 'MLFQ'].includes(item.algorithm) ? { ...rest, ...(queueLevel === undefined ? {} : { queueLevel }) } : rest })
      const result = await runSimulation({ processes: inputs, config }, signal)
      entries.push({ algorithm: item.algorithm, result, error: '' })
    } catch (error) {
      if (signal.aborted) throw error
      entries.push({ algorithm: item.algorithm, result: null, error: error instanceof Error ? error.message : 'Invalid configuration.' })
    }
  }
  return entries
}
export function comparisonWinners(results: SchedulingResult[], metric: ComparisonMetric) {
  if (!results.length) return []
  const maximize = comparisonMetrics.find(m => m[0] === metric)![3], values = results.map(r => r.metrics[metric])
  const best = maximize ? Math.max(...values) : Math.min(...values)
  return results.filter(r => Math.abs(r.metrics[metric] - best) <= 1e-10).map(r => r.algorithm)
}
export function comparisonInsights(results: SchedulingResult[]) {
  return comparisonMetrics.map(([metric, label, unit]) => { const winners = comparisonWinners(results, metric); const value = results.find(r => r.algorithm === winners[0])?.metrics[metric]; return `${label}: ${winners.join(', ')} ${winners.length > 1 ? 'tie at' : 'achieves'} ${value?.toFixed(4) ?? 'no result'} ${unit} for this dataset and configuration.` })
}
