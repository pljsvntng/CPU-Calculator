import { useCallback, useEffect, useRef, useState } from 'react'
import type { AlgorithmId } from '../types'
import type { LearningProgress, PracticeAttempt, QuizAttempt } from '../types/learning'
import { addPracticeAttempt, addQuizAttempt, emptyLearningProgress, LEARNING_PROGRESS_KEY, loadLearningProgress } from '../utils/learningProgress'
export function useLearningProgress() {
  const [state, setState] = useState(() => loadLearningProgress())
  const current = useRef(state.progress)
  const commit = useCallback((update: (progress: LearningProgress) => LearningProgress) => {
    const progress = update(current.current)
    current.current = progress
    let warning = ''
    try { window.localStorage.setItem(LEARNING_PROGRESS_KEY, JSON.stringify(progress)) }
    catch { warning = 'Progress is kept in this tab; browser storage is unavailable.' }
    setState({ progress, warning })
  }, [])
  useEffect(() => {
    const refresh = (event: StorageEvent) => { if (event.key === LEARNING_PROGRESS_KEY || event.key === null) { const loaded = loadLearningProgress(); current.current = loaded.progress; setState(loaded) } }
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])
  return { ...state, study: (id: AlgorithmId) => commit(p => ({ ...p, recentAlgorithm: id })),
    completeLesson: (id: AlgorithmId) => commit(p => ({ ...p, recentAlgorithm: id, completedLessons: p.completedLessons.includes(id) ? p.completedLessons : [...p.completedLessons, id] })),
    recordPractice: (attempt: PracticeAttempt) => commit(p => addPracticeAttempt(p, attempt)), recordQuiz: (attempt: QuizAttempt) => commit(p => addQuizAttempt(p, attempt)),
    reset: () => {
      const progress = emptyLearningProgress(); current.current = progress
      let warning = ''
      try { window.localStorage.removeItem(LEARNING_PROGRESS_KEY) } catch { warning = 'Stored progress could not be removed; the in-memory record was reset.' }
      setState({ progress, warning })
    },
  }
}
export type LearningProgressController = ReturnType<typeof useLearningProgress>
