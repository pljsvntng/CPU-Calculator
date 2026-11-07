import { useState } from 'react'
import type { PracticeAnswers, PracticeEvaluation, PracticeProblem, PracticeAttempt } from '../types/learning'
import type { SchedulingResult } from '../types/scheduling'
import { generatePracticeProblem, newPracticeSeed } from '../utils/practiceGenerator'
import { checkPracticeAnswers, emptyPracticeAnswers } from '../utils/answerChecker'
import { executeSimulation } from '../services/simulationTask'
interface PracticeState { problem: PracticeProblem | null; solution: SchedulingResult | null; answers: PracticeAnswers | null; revision: number; evaluatedRevision: number; evaluation: PracticeEvaluation | null; hintLevel: number; reveal: boolean; error: string }
export function usePracticeMission(record: (attempt: PracticeAttempt) => void) {
  const [state, setState] = useState<PracticeState>({ problem: null, solution: null, answers: null, revision: 0, evaluatedRevision: -1, evaluation: null, hintLevel: 0, reveal: false, error: '' })
  return { ...state, stale: !!state.evaluation && state.evaluatedRevision !== state.revision,
    generate: (options: Parameters<typeof generatePracticeProblem>[0]) => {
      try {
        const problem = generatePracticeProblem({ ...options, seed: options.seed ?? newPracticeSeed() }), solution = executeSimulation(problem)
        setState({ problem, solution, answers: emptyPracticeAnswers(problem), revision: 0, evaluatedRevision: -1, evaluation: null, hintLevel: 0, reveal: false, error: '' })
      } catch (error) { setState(previous => ({ ...previous, error: error instanceof Error ? error.message : 'Could not generate a valid mission.' })) }
    },
    edit: (update: (answers: PracticeAnswers) => PracticeAnswers) => setState(previous => previous.answers ? { ...previous, answers: update(previous.answers), revision: previous.revision + 1, reveal: false } : previous),
    check: () => {
      if (!state.problem || !state.solution || !state.answers || state.evaluatedRevision === state.revision) return
      const evaluation = checkPracticeAnswers(state.problem, state.answers, state.solution)
      record({ id: newPracticeSeed(), algorithm: state.problem.algorithm, difficulty: state.problem.difficulty, seed: state.problem.seed, score: Math.min(100, evaluation.percentage), at: new Date().toISOString() })
      setState(previous => ({ ...previous, evaluation, evaluatedRevision: state.revision, reveal: false }))
    },
    retry: () => setState(previous => previous.problem ? { ...previous, answers: emptyPracticeAnswers(previous.problem), revision: previous.revision + 1, evaluatedRevision: -1, evaluation: null, hintLevel: 0, reveal: false } : previous),
    hint: () => setState(previous => ({ ...previous, hintLevel: Math.min(3, previous.hintLevel + 1) })),
    showSolution: () => setState(previous => previous.evaluation && previous.evaluatedRevision === previous.revision ? { ...previous, reveal: true } : previous),
  }
}
export type PracticeController = ReturnType<typeof usePracticeMission>
