import type { SimulationLimits } from '../types/scheduling'

export const DEFAULT_LIMITS: Required<SimulationLimits> = {
  maxTransitions: 100_000,
  maxSegments: 50_000,
  maxEvents: 200_000,
  maxSnapshotEntries: 2_000_000,
}
