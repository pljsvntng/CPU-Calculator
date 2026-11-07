import type { AlgorithmId } from '../types'
import type { Difficulty, PracticeProblem } from '../types/learning'
import type { SchedulingConfig } from '../types/scheduling'
import { validateSchedulingInput } from './schedulingValidation'

export function seededRandom(seed: string) {
  let state = 2166136261
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0
  return () => { state = (state + 0x6D2B79F5) >>> 0; let value = state; value = Math.imul(value ^ value >>> 15, value | 1); value ^= value + Math.imul(value ^ value >>> 7, value | 61); return ((value ^ value >>> 14) >>> 0) / 4294967296 }
}
export function newPracticeSeed() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}` }
export function generatePracticeProblem(options: { algorithm: AlgorithmId; difficulty: Difficulty; seed?: string; advanced?: boolean }): PracticeProblem {
  const seed = options.seed ?? 'cpu-lab-default'
  if (!seed.trim() || seed.length > 64) throw new Error('Use a seed containing 1–64 characters.')
  if (!['easy', 'medium', 'hard'].includes(options.difficulty)) throw new Error('Choose a supported difficulty.')
  const random = seededRandom(`${options.algorithm}:${options.difficulty}:${seed}`)
  const integer = (min: number, max: number) => min + Math.floor(random() * (max - min + 1))
  const hard = options.difficulty === 'hard', easy = options.difficulty === 'easy'
  const count = easy ? 3 : hard ? integer(5, 8) : integer(4, 5)
  const quantum = easy ? 3 : hard ? integer(1, 2) : integer(2, 3)
  let config: SchedulingConfig
  switch (options.algorithm) {
    case 'FCFS': case 'SJF': case 'SRTF': config = { algorithm: options.algorithm }; break
    case 'NPP': case 'PP': config = { algorithm: options.algorithm, priorityDirection: 'lower-first' }; break
    case 'RR': config = { algorithm: 'RR', quantum }; break
    case 'MLQ': config = { algorithm: 'MLQ', priorityDirection: 'lower-first', interqueuePreemption: true, queues: [{ level: 1, priority: 0, policy: { algorithm: hard ? 'PP' : 'NPP' } }, { level: 2, priority: 1, policy: { algorithm: 'SRTF' } }] }; break
    case 'MLFQ': config = { algorithm: 'MLFQ', interqueuePreemption: true, levels: [{ level: 1, policy: { algorithm: 'RR', quantum: easy ? 2 : 1 } }, { level: 2, policy: { algorithm: 'RR', quantum: easy ? 3 : 2 } }, { level: 3, policy: { algorithm: 'FCFS' } }] }; break
    default: throw new Error('Choose a supported scheduling algorithm.')
  }
  const processes = Array.from({ length: count }, (_, index) => {
    const queueLevel = options.algorithm === 'MLFQ' ? 1 : options.algorithm === 'MLQ' ? (index % 2 ? 1 : 2) : undefined
    const priority = options.algorithm === 'NPP' || options.algorithm === 'PP' || (options.algorithm === 'MLQ' && queueLevel === 1) ? integer(1, 5) : undefined
    let arrivalTime = easy ? 0 : hard ? (index === 0 ? 2 : index === 1 ? 3 : index === 2 ? 4 : index === 3 ? 12 : integer(13, 18)) : (index === 0 ? 0 : integer(1, 7))
    let burstTime = easy ? integer(1, 4) : integer(2, 8)
    if (hard && index < 3) burstTime = [10, 5, 2][index]
    if (hard && index === 3) arrivalTime = 12
    return { id: `P${index + 1}`, arrivalTime, burstTime, originalInputOrder: index,
      ...(priority === undefined ? {} : { priority: hard && options.algorithm === 'PP' && index < 3 ? [5, 3, 1][index] : priority }),
      ...(queueLevel === undefined ? {} : { queueLevel }),
    }
  })
  validateSchedulingInput(processes, config)
  return { id: `${options.algorithm}:${options.difficulty}:${options.advanced ? 'advanced' : 'core'}:${seed}`, algorithm: options.algorithm, difficulty: options.difficulty, seed, advanced: options.advanced ?? false, boundaryMode: ['RR', 'MLQ', 'MLFQ'].includes(options.algorithm) ? 'decisions' : 'continuous', processes, config }
}
