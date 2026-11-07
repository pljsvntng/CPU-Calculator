import { algorithms } from '../data/algorithms'
import type { AlgorithmId } from '../types'
import type { LearningProgress, PracticeAttempt, QuizAttempt } from '../types/learning'
import { newPracticeSeed } from './practiceGenerator'
export function createQuizAttempt(questionId: string, algorithm: AlgorithmId, correct: boolean): QuizAttempt {
  return { id: newPracticeSeed(), questionId, algorithm, correct, at: new Date().toISOString() }
}
export const LEARNING_PROGRESS_KEY = 'cpu-scheduling-lab.learning.v1'
export const isAlgorithm = (value: unknown): value is AlgorithmId => algorithms.some(algorithm => algorithm.id === value)
export const emptyLearningProgress = (): LearningProgress => ({ version: 1, completedLessons: [], recentAlgorithm: null, practiceAttempts: [], quizAttempts: [], bestScores: {}, practiceTotal: 0, quizTotal: 0, quizCorrect: 0 })
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown, maximum = 160) => typeof value === 'string' && value.length > 0 && value.length <= maximum
const counter = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0
const score = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100.000000001
const date = (value: unknown) => text(value, 40) && Number.isFinite(Date.parse(String(value)))
export function parseLearningProgress(raw: string): LearningProgress | null {
  try {
    const p: unknown = JSON.parse(raw)
    if (!record(p) || p.version !== 1 || !Array.isArray(p.completedLessons) || p.completedLessons.length > 8 || !p.completedLessons.every(isAlgorithm) || new Set(p.completedLessons).size !== p.completedLessons.length || !(p.recentAlgorithm === null || isAlgorithm(p.recentAlgorithm)) || !Array.isArray(p.practiceAttempts) || p.practiceAttempts.length > 100 || !Array.isArray(p.quizAttempts) || p.quizAttempts.length > 200 || !record(p.bestScores) || !counter(p.practiceTotal) || !counter(p.quizTotal) || !counter(p.quizCorrect) || p.quizCorrect > p.quizTotal) return null
    if (!p.practiceAttempts.every(a => record(a) && text(a.id) && isAlgorithm(a.algorithm) && ['easy', 'medium', 'hard'].includes(String(a.difficulty)) && text(a.seed, 64) && score(a.score) && date(a.at))) return null
    if (!p.quizAttempts.every(a => record(a) && text(a.id) && text(a.questionId, 120) && isAlgorithm(a.algorithm) && typeof a.correct === 'boolean' && date(a.at))) return null
    if (!Object.entries(p.bestScores).every(([id, value]) => isAlgorithm(id) && score(value))) return null
    const practices = p.practiceAttempts as unknown as PracticeAttempt[], quizzes = p.quizAttempts as unknown as QuizAttempt[]
    if (quizzes.filter(a => a.correct).length > p.quizCorrect || quizzes.filter(a => !a.correct).length > p.quizTotal - p.quizCorrect) return null
    if (p.practiceTotal < practices.length || p.quizTotal < quizzes.length || new Set(practices.map(a => a.id)).size !== practices.length || new Set(quizzes.map(a => a.id)).size !== quizzes.length || practices.some(a => Number((p.bestScores as Record<string, unknown>)[a.algorithm] ?? 0) + 1e-9 < a.score)) return null
    return { version: 1, completedLessons: p.completedLessons, recentAlgorithm: p.recentAlgorithm, practiceAttempts: practices, quizAttempts: quizzes, bestScores: Object.fromEntries(Object.entries(p.bestScores)), practiceTotal: p.practiceTotal, quizTotal: p.quizTotal, quizCorrect: p.quizCorrect }
  } catch { return null }
}
export function loadLearningProgress(storage?: Pick<Storage, 'getItem'>) {
  try {
    const raw = (storage ?? window.localStorage).getItem(LEARNING_PROGRESS_KEY)
    if (raw === null) return { progress: emptyLearningProgress(), warning: '' }
    const progress = parseLearningProgress(raw)
    return { progress: progress ?? emptyLearningProgress(), warning: progress ? '' : 'Stored learning progress is invalid or corrupted. A fresh in-memory record is being used; reset or make a new learning action to replace it.' }
  } catch { return { progress: emptyLearningProgress(), warning: 'Browser storage is unavailable. Learning still works in this tab.' } }
}
export function addPracticeAttempt(progress: LearningProgress, attempt: PracticeAttempt): LearningProgress {
  if (progress.practiceAttempts.some(previous => previous.id === attempt.id)) return progress
  return { ...progress, practiceAttempts: [...progress.practiceAttempts, attempt].slice(-100), practiceTotal: progress.practiceTotal + 1, bestScores: { ...progress.bestScores, [attempt.algorithm]: Math.max(progress.bestScores[attempt.algorithm] ?? 0, Math.min(100, attempt.score)) } }
}
export function addQuizAttempt(progress: LearningProgress, attempt: QuizAttempt): LearningProgress {
  return progress.quizAttempts.some(a => a.id === attempt.id) ? progress : { ...progress, quizAttempts: [...progress.quizAttempts, attempt].slice(-200), quizTotal: progress.quizTotal + 1, quizCorrect: progress.quizCorrect + Number(attempt.correct) }
}
export function learningAchievements(progress: LearningProgress) {
  const mastery = (id: AlgorithmId) => progress.completedLessons.includes(id) && (progress.bestScores[id] ?? 0) >= 80
  return [
    ['first', 'First Mission Completed', 'Earn at least 80% on a submitted practice mission.', progress.practiceTotal > 0 && Object.values(progress.bestScores).some(score => (score ?? 0) >= 80)],
    ['fcfs', 'FCFS Specialist', 'Complete the FCFS lesson and earn 80% in FCFS practice.', mastery('FCFS')],
    ['sjf', 'SJF Specialist', 'Complete the SJF lesson and earn 80% in SJF practice.', mastery('SJF')],
    ['priority', 'Priority Master', 'Complete NPP and PP lessons and earn 80% in each.', mastery('NPP') && mastery('PP')],
    ['preemption', 'Preemption Expert', 'Complete SRTF and PP lessons and earn 80% in each.', mastery('SRTF') && mastery('PP')],
    ['rr', 'Round Robin Commander', 'Complete RR and earn 80% in RR practice.', mastery('RR')],
    ['queue', 'Queue Specialist', 'Complete MLQ/MLFQ lessons and earn 80% in each.', mastery('MLQ') && mastery('MLFQ')],
    ['champion', 'Scheduling Champion', 'Complete every lesson and earn 80% in every algorithm.', algorithms.every(algorithm => mastery(algorithm.id))],
  ].map(([id, name, requirement, earned]) => ({ id: String(id), name: String(name), requirement: String(requirement), earned: Boolean(earned) }))
}
