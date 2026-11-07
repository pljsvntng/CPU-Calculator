import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CalculatorDraft } from '../types'
import type { SchedulingResult } from '../types/scheduling'
import { createCalculatorDraft, prepareRequest } from '../utils/calculator'
import { runSimulation } from '../services/schedulerClient'
import { assertResultConsistent } from '../utils/resultConsistency'

interface CalculatorState {
  draft: CalculatorDraft
  revision: number
  status: 'idle' | 'running' | 'success' | 'error'
  error: string | null
  latest: { result: SchedulingResult; revision: number } | null
}
export function useCalculator() {
  const [state, setState] = useState<CalculatorState>(() => ({ draft: createCalculatorDraft(), revision: 0, status: 'idle', error: null, latest: null }))
  const current = useRef(state)
  useLayoutEffect(() => { current.current = state }, [state])
  const generation = useRef(0)
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => { generation.current++; active.current?.abort() }, [])
  const change = useCallback((update: CalculatorDraft | ((previous: CalculatorDraft) => CalculatorDraft)) => {
    generation.current++
    active.current?.abort()
    setState(previous => ({ ...previous, draft: typeof update === 'function' ? update(previous.draft) : update,
      revision: previous.revision + 1, status: 'idle', error: null,
    }))
  }, [])
  const calculate = useCallback(async (replacement?: CalculatorDraft) => {
    const token = ++generation.current
    active.current?.abort()
    const draft = replacement ?? current.current.draft
    const revision = current.current.revision + (replacement ? 1 : 0)
    const prepared = prepareRequest(draft)
    if (!prepared.request) {
      setState(previous => ({ ...previous, draft, revision, status: 'error', error: Object.values(prepared.errors)[0] }))
      return
    }
    const request = prepared.request
    const controller = new AbortController()
    active.current = controller
    setState(previous => ({ ...previous, draft, revision, status: 'running', error: null }))
    try {
      const result = await runSimulation(request, controller.signal)
      if (token !== generation.current) return
      assertResultConsistent(result, request)
      setState(previous => ({ ...previous, latest: { result, revision }, status: 'success', error: null }))
    } catch (error) {
      if (token !== generation.current) return
      setState(previous => ({ ...previous, status: 'error', error: error instanceof Error ? error.message : 'The scheduling engine could not complete the simulation.' }))
    } finally { if (token === generation.current) active.current = null }
  }, [])
  const prepared = useMemo(() => prepareRequest(state.draft), [state.draft])
  return { ...state, ...prepared, change, calculate,
    outdated: !!state.latest && (state.latest.revision !== state.revision || state.status === 'error' || state.status === 'running'),
  }
}
export type CalculatorController = ReturnType<typeof useCalculator>
