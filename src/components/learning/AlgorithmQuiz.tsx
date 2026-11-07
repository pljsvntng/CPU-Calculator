import { useMemo, useState } from 'react'
import { createQuizQuestion, gradeQuizAnswer, quizQuestions } from '../../data/quizQuestions'
import type { AlgorithmId } from '../../types'
import type { LearningProgressController } from '../../hooks/useLearningProgress'
import { createQuizAttempt } from '../../utils/learningProgress'
import { SchedulingDataset } from './SchedulingDataset'
import { SchedulingGanttChart } from '../gantt/SchedulingGanttChart'

export function AlgorithmQuiz({ algorithm, controller }: { algorithm: AlgorithmId; controller: LearningProgressController }) {
  const [id, setId] = useState(`${algorithm}:concept`)
  return <section className="panel training-panel" aria-label="Academy quiz"><p className="eyebrow">STUDY MODE / IMMEDIATE FEEDBACK</p><h2>Knowledge check</h2><label className="field-label" htmlFor="quiz-question">Quiz question</label><select id="quiz-question" value={id} onChange={e => setId(e.target.value)}>{quizQuestions.map(q => <option key={q.id} value={q.id}>{q.algorithm} · {q.variant === 'concept' ? 'Concepts' : 'Applied scheduling'}</option>)}</select><QuizQuestion key={id} id={id} controller={controller} /></section>
}
function QuizQuestion({ id, controller }: { id: string; controller: LearningProgressController }) {
  const question = useMemo(() => createQuizQuestion(id), [id]), [raw, setRaw] = useState(''), [graded, setGraded] = useState<string | null>(null)
  const feedback = graded === null ? null : gradeQuizAnswer(question, graded)
  const grade = (value: string) => { setRaw(value); setGraded(value); const result = gradeQuizAnswer(question, value); if (value.trim()) controller.recordQuiz(createQuizAttempt(id, question.algorithm, result.correct)) }
  return <div className="quiz-question"><span className="badge blue">{question.algorithm} · {question.type}</span><h3>{question.text}</h3><p className="source-note">{question.source}</p>{question.result && <SchedulingDataset request={{ processes: question.result.processes, config: question.result.config }} source="Use this problem’s exact configuration to answer." />}{question.showTimeline && <SchedulingGanttChart result={question.result!} />}
    {question.options ? <fieldset className="quiz-options"><legend>Choose your answer</legend>{question.options.map(option => <label key={option.value}><input type="radio" name="quiz-choice" value={option.value} checked={raw === option.value} onChange={() => grade(option.value)} />{option.label}</label>)}</fieldset> : <form onSubmit={e => { e.preventDefault(); if (graded !== raw) grade(raw) }}><label className="field-label" htmlFor="quiz-number">Your numerical answer</label><input id="quiz-number" inputMode="decimal" value={raw} onChange={e => { setRaw(e.target.value); setGraded(null) }} /><button className="button primary" disabled={graded === raw} type="submit">Check quiz answer</button></form>}
    {feedback && <div className={`training-feedback ${feedback.correct ? 'correct' : 'incorrect'}`} role="status"><strong>{feedback.correct ? 'Correct' : feedback.status === 'missing' ? 'Answer required' : 'Review this answer'}</strong><p>Correct answer: {feedback.expected}. {question.explanation}</p></div>}<button className="button secondary small" onClick={() => { setRaw(''); setGraded(null) }}>Retry question</button><p className="source-note">Each answered submission is a study attempt. Retrying keeps earlier attempts in your local record.</p></div>
}
