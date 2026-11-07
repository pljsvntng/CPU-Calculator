import type { CalculatorDraft, ProcessInput } from '../types'
import { MAX_CREW, needsProcessPriority } from './calculator'
import { integerError } from './validation'

export interface RandomCrewOptions { count: string; maxArrival: string; maxBurst: string; minPriority: string; maxPriority: string }
export const defaultRandomOptions: RandomCrewOptions = { count: '5', maxArrival: '10', maxBurst: '10', minPriority: '1', maxPriority: '5' }
export function randomOptionsErrors(options: RandomCrewOptions, includePriority = true) {
  const errors: Record<string, string> = {}
  for (const [key, label, minimum, maximum] of [
    ['count', 'Process count', 1, MAX_CREW], ['maxArrival', 'Maximum arrival time', 0, 1000],
    ['maxBurst', 'Maximum burst time', 1, 100], ['minPriority', 'Minimum priority', 0, 1000], ['maxPriority', 'Maximum priority', 0, 1000],
  ] as const) {
    if (!includePriority && (key === 'minPriority' || key === 'maxPriority')) continue
    if (integerError(options[key], minimum) || Number(options[key]) > maximum) errors[key] = `${label} must be an integer from ${minimum} to ${maximum}.`
  }
  if (includePriority && !errors.minPriority && !errors.maxPriority && Number(options.minPriority) > Number(options.maxPriority)) errors.maxPriority = 'Maximum priority must be at least the minimum priority.'
  return errors
}
export function generateRandomCrew(draft: CalculatorDraft, options: RandomCrewOptions, random = Math.random): ProcessInput[] {
  const priorities = needsProcessPriority(draft)
  const errors = randomOptionsErrors(options, priorities)
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0])
  const pick = (min: number, max: number) => min + Math.floor(random() * (max - min + 1))
  return Array.from({ length: Number(options.count) }, (_, i) => ({
    id: i + 1, arrival: String(pick(0, Number(options.maxArrival))), burst: String(pick(1, Number(options.maxBurst))),
    priority: String(priorities ? pick(Number(options.minPriority), Number(options.maxPriority)) : 0),
    queue: String(draft.algorithm === 'MLQ' ? pick(1, draft.mlqQueues.length) : 1),
  }))
}
