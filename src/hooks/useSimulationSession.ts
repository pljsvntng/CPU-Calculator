import { createContext, useContext } from 'react'
import type { SimulationPlayback } from './useSimulationPlayback'

export const SimulationSessionContext = createContext<SimulationPlayback | null>(null)
export function useSimulationSession() { return useContext(SimulationSessionContext) }
