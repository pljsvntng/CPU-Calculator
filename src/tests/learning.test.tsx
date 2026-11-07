import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { algorithms } from '../data/algorithms'
import { algorithmLessons, schedulingGlossary } from '../data/algorithmLessons'
import { lectureInputExamples } from '../data/lectureExamples'
import { lectureExamples } from './fixtures/lectureExamples'
import { createQuizQuestion, gradeQuizAnswer, quizQuestions } from '../data/quizQuestions'
import { addPracticeAttempt, addQuizAttempt, emptyLearningProgress, learningAchievements, LEARNING_PROGRESS_KEY, loadLearningProgress, parseLearningProgress } from '../utils/learningProgress'
import { useLearningProgress } from '../hooks/useLearningProgress'
import { generatePracticeProblem } from '../utils/practiceGenerator'
import { executeSimulation } from '../services/simulationTask'
import type { PracticeAttempt } from '../types/learning'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())
const attempt: PracticeAttempt = { id: 'one', algorithm: 'FCFS', difficulty: 'easy', seed: 'test', score: 90, at: '2026-11-03T00:00:00.000Z' }
describe('lecture-grounded lessons and engine-derived quizzes', () => {
  it.each(algorithms)('$id has a complete lesson, accurate selection rules and two audited lecture examples', a => {
    const lesson = algorithmLessons[a.id]
    for (const field of ['rules', 'steps', 'advantages', 'limitations', 'mistakes'] as const) expect(lesson[field].length).toBeGreaterThan(0)
    const inputs = lectureInputExamples.filter(e => e.config.algorithm === a.id)
    expect(inputs).toHaveLength(2)
    for (const input of inputs) {
      const fixture = lectureExamples.find(e => e.page === input.page)!, result = executeSimulation(input)
      expect(result.processes.map(p => p.completionTime)).toEqual(fixture.completion)
    }
  })
  it('distinguishes non-preemption, remaining work, fixed queues and feedback budgets', () => {
    expect(algorithmLessons.SJF.rules.join(' ')).toContain('does not interrupt')
    expect(algorithmLessons.SRTF.rules.join(' ')).toContain('remaining')
    expect(algorithmLessons.MLQ.rules.join(' ')).toContain('fixed queue')
    expect(algorithmLessons.MLFQ.mistakes.join(' ')).toContain('did not consume a full quantum')
    expect(schedulingGlossary).toHaveLength(10)
    expect(lectureInputExamples.find(e => e.page === 19)!.processes[2].priority).toBe(1)
  })
  it.each(quizQuestions)('$id grades its actual answer and rejects a different answer', definition => {
    const question = createQuizQuestion(definition.id)
    expect(gradeQuizAnswer(question, String(question.answer.value)).correct).toBe(true)
    expect(gradeQuizAnswer(question, 'wrong answer').correct).toBe(false)
    expect(gradeQuizAnswer(question, '').status).toBe('missing')
    if (question.result) {
      expect(question.result).toEqual(executeSimulation({ processes: question.result.processes, config: question.result.config }))
      expect(question.source).toContain('Supplemental')
    }
  })
  it('covers every requested question type and rejects unknown questions', () => {
    const types = new Set(quizQuestions.map(q => createQuizQuestion(q.id).type))
    expect(types).toEqual(new Set(['Multiple choice', 'True or false', 'Identify the algorithm', 'Identify the next process', 'Calculate waiting time', 'Calculate turnaround time', 'Identify a scheduling rule', 'Interpret a Gantt chart']))
    expect(() => createQuizQuestion('bad')).toThrow(/Unknown/)
  })
})
describe('validated browser-only learning records', () => {
  it('round trips real attempts, deduplicates identifiers, and awards achievements only after requirements', () => {
    const fresh = emptyLearningProgress()
    expect(learningAchievements(fresh).every(a => !a.earned)).toBe(true)
    const p = addPracticeAttempt(fresh, attempt)
    expect(addPracticeAttempt(p, attempt)).toBe(p)
    expect(learningAchievements(p).find(a => a.id === 'first')!.earned).toBe(true)
    expect(learningAchievements(p).find(a => a.id === 'fcfs')!.earned).toBe(false)
    p.completedLessons = ['FCFS']
    expect(learningAchievements(p).find(a => a.id === 'fcfs')!.earned).toBe(true)
    expect(parseLearningProgress(JSON.stringify(p))).toEqual(p)
  })
  it('bounds retained histories without losing totals or best scores', () => {
    let p = emptyLearningProgress()
    for (let i = 0; i < 105; i++) p = addPracticeAttempt(p, { ...attempt, id: String(i), score: i === 0 ? 100 : 50 })
    for (let i = 0; i < 205; i++) p = addQuizAttempt(p, { id: String(i), questionId: 'FCFS:concept', algorithm: 'FCFS', correct: i % 2 === 0, at: attempt.at })
    expect(p.practiceAttempts).toHaveLength(100); expect(p.practiceTotal).toBe(105); expect(p.bestScores.FCFS).toBe(100)
    expect(p.quizAttempts).toHaveLength(200); expect(p.quizTotal).toBe(205); expect(p.quizCorrect).toBe(103)
    expect(parseLearningProgress(JSON.stringify(p))).toEqual(p)
  })
  it.each(['{', 'null', '[]', '{"version":999}', JSON.stringify({ ...emptyLearningProgress(), completedLessons: ['BOGUS'] }), JSON.stringify({ ...emptyLearningProgress(), bestScores: { FCFS: 101 } }), JSON.stringify({ ...emptyLearningProgress(), quizCorrect: 1 })])('handles corrupt or unsupported storage %s', raw => {
    expect(parseLearningProgress(raw)).toBeNull()
    const loaded = loadLearningProgress({ getItem: () => raw })
    expect(loaded.progress).toEqual(emptyLearningProgress()); expect(loaded.warning).toContain('corrupted')
  })
  it('continues when storage reads or writes are blocked', () => {
    expect(loadLearningProgress({ getItem: () => { throw new Error('blocked') } }).warning).toContain('unavailable')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    const { result } = renderHook(useLearningProgress)
    act(() => result.current.completeLesson('RR'))
    expect(result.current.progress.completedLessons).toEqual(['RR']); expect(result.current.warning).toContain('unavailable')
  })
  it('persists, reloads, and resets only the learning storage key', () => {
    localStorage.setItem('unrelated-setting', 'keep')
    const first = renderHook(useLearningProgress)
    act(() => { first.result.current.study('MLQ'); first.result.current.completeLesson('MLQ'); first.result.current.recordPractice(attempt) })
    first.unmount()
    const next = renderHook(useLearningProgress)
    expect(next.result.current.progress.recentAlgorithm).toBe('MLQ'); expect(next.result.current.progress.practiceTotal).toBe(1)
    act(() => next.result.current.reset())
    expect(localStorage.getItem(LEARNING_PROGRESS_KEY)).toBeNull(); expect(localStorage.getItem('unrelated-setting')).toBe('keep')
  })
})
const open = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
describe('academy and practice interactions', { timeout: 60_000 }, () => {
  it('requires worked review for lesson completion, grades quizzes immediately and confirms resets', () => {
    open('/learn?algorithm=FCFS')
    expect(screen.getAllByRole('button', { name: /Start Learning / })).toHaveLength(8)
    expect(screen.getByRole('button', { name: 'Mark FCFS lesson complete' })).toBeDisabled()
    click('Calculate lecture example')
    fireEvent.click(screen.getByLabelText('I reviewed the scheduling rules, timeline and calculations.'))
    click('Mark FCFS lesson complete')
    expect(loadLearningProgress().progress.completedLessons).toEqual(['FCFS'])
    click('Interactive quizzes')
    fireEvent.click(screen.getByRole('radio', { name: 'Earliest arrival' }))
    expect(screen.getByRole('status')).toHaveTextContent('Correct answer: Earliest arrival')
    expect(loadLearningProgress().progress.quizCorrect).toBe(1)
    click('Reset Learning Progress'); click('Cancel reset')
    expect(loadLearningProgress().progress.completedLessons).toEqual(['FCFS'])
    click('Reset Learning Progress'); click('Confirm reset')
    expect(loadLearningProgress().progress.completedLessons).toEqual([])
  })
  it('edits and reorders student intervals, gives feedback, retries, then sends the exact problem to the main calculator', async () => {
    open('/practice?algorithm=FCFS')
    fireEvent.change(screen.getByLabelText('Optional random seed'), { target: { value: 'integration' } })
    click('Generate practice problem')
    expect(screen.queryByRole('button', { name: 'SHOW COMPLETE SOLUTION' })).not.toBeInTheDocument()
    click('REQUEST HINT'); click('REQUEST HINT'); click('REQUEST HINT')
    expect(screen.getByRole('button', { name: 'REQUEST HINT' })).toBeDisabled()
    click('CHECK MY ANSWERS')
    expect(screen.getByRole('region', { name: 'Mission evaluation' })).toHaveTextContent('0.00 / 100')
    expect(loadLearningProgress().progress.practiceTotal).toBe(1)
    click('Retry same problem')
    const problem = generatePracticeProblem({ algorithm: 'FCFS', difficulty: 'easy', seed: 'integration' }), solution = executeSimulation(problem)
    for (const p of solution.processes) for (const [field, value] of [['ET', p.completionTime], ['TT', p.turnaroundTime], ['WT', p.waitingTime]] as const) fireEvent.change(screen.getByLabelText(`${p.id} ${field} answer`), { target: { value: String(value) } })
    for (const [i, s] of solution.segments.entries()) {
      click('Add Segment')
      fireEvent.change(screen.getByLabelText(`Interval ${i + 1} process`), { target: { value: s.processId ?? 'IDLE' } })
      fireEvent.change(screen.getByLabelText(`Interval ${i + 1} start`), { target: { value: String(s.startTime) } })
      fireEvent.change(screen.getByLabelText(`Interval ${i + 1} end`), { target: { value: String(s.endTime) } })
    }
    click('Move interval 1 down'); click('Move interval 2 up')
    click('Add Segment'); click(`Remove interval ${solution.segments.length + 1}`)
    click('CHECK MY ANSWERS')
    expect(screen.getByRole('region', { name: 'Mission evaluation' })).toHaveTextContent('100.00 / 100')
    click('SHOW COMPLETE SOLUTION')
    expect(screen.getByRole('table', { name: 'Calculated process results' })).toBeInTheDocument()
    click('Send problem to calculator')
    await waitFor(() => expect(screen.getByRole('status', { name: 'Calculation status' })).toHaveTextContent('Calculation completed'), { timeout: 10_000 })
    expect(screen.getByRole('status', { name: 'Input source' })).toHaveTextContent('Supplemental practice mission · FCFS')
    for (const p of solution.processes) {
      expect(screen.getByLabelText(`${p.id} burst time`)).toHaveValue(p.burstTime)
      const row = within(screen.getByRole('table', { name: 'Calculated process results' })).getByRole('rowheader', { name: p.id }).closest('tr')!
      expect(row).toHaveTextContent(String(p.completionTime))
    }
    expect(loadLearningProgress().progress.bestScores.FCFS).toBeCloseTo(100)
  })
})
