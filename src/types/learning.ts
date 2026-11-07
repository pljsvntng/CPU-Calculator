import type { AlgorithmId } from './index'
import type { SchedulingRequest } from '../utils/calculator'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type OpenTrainingProblem = (request: SchedulingRequest, source: { label: string; note: string }) => void
export interface PracticeProblem extends SchedulingRequest {
  id: string; algorithm: AlgorithmId; difficulty: Difficulty; seed: string; advanced: boolean; boundaryMode: 'continuous' | 'decisions'
}
export type AnswerMetric = 'completionTime' | 'turnaroundTime' | 'waitingTime' | 'responseTime'
export interface GanttAnswer { id: number; processId: string; start: string; end: string }
export interface PracticeAnswers { processes: Record<string, Partial<Record<AnswerMetric, string>>>; averages: Record<string, string>; segments: GanttAnswer[]; nextSegmentId: number }
export type AnswerStatus = 'correct' | 'incorrect' | 'missing' | 'invalid'
export interface AnswerFeedback { key: string; label: string; status: AnswerStatus; submitted: string; expected: string; explanation: string }
export interface CategoryScore { name: string; weight: number; maximum: number; earned: number; correct: number; total: number }
export interface PracticeEvaluation { items: AnswerFeedback[]; categories: CategoryScore[]; earned: number; maximum: 100; percentage: number }
export interface PracticeAttempt { id: string; algorithm: AlgorithmId; difficulty: Difficulty; seed: string; score: number; at: string }
export interface QuizAttempt { id: string; questionId: string; algorithm: AlgorithmId; correct: boolean; at: string }
export interface LearningProgress {
  version: 1; completedLessons: AlgorithmId[]; recentAlgorithm: AlgorithmId | null; practiceAttempts: PracticeAttempt[]; quizAttempts: QuizAttempt[]
  bestScores: Partial<Record<AlgorithmId, number>>; practiceTotal: number; quizTotal: number; quizCorrect: number
}
