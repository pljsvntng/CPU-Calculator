import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { algorithms } from '../data/algorithms'
import { algorithmLessons } from '../data/algorithmLessons'
import { PageIntro } from '../components/ui'
import { CrewAvatar } from '../components/CrewAvatar'
import { AlgorithmLesson } from '../components/learning/AlgorithmLesson'
import { AlgorithmQuiz } from '../components/learning/AlgorithmQuiz'
import { LessonProgress } from '../components/learning/LessonProgress'
import type { AlgorithmId } from '../types'
import type { LearningProgressController } from '../hooks/useLearningProgress'
import type { OpenTrainingProblem } from '../types/learning'

export function LearningPage({ controller, onOpen }: { controller: LearningProgressController; onOpen: OpenTrainingProblem }) {
  const [params, setParams] = useSearchParams(), [tab, setTab] = useState<'lessons' | 'quiz'>('lessons')
  const selected = algorithms.find(a => a.id === params.get('algorithm')) ?? algorithms.find(a => a.id === controller.progress.recentAlgorithm) ?? algorithms[0]
  const workspace = useRef<HTMLDivElement>(null)
  const choose = (id: AlgorithmId) => {
    setParams({ algorithm: id }); controller.study(id); setTab('lessons')
    workspace.current?.scrollIntoView?.({ block: 'start' })
    workspace.current?.focus({ preventScroll: true })
  }
  return <><PageIntro eyebrow="LEARNING CENTER / LECTURE 05" title="CREWMATE ACADEMY" description="Master CPU scheduling and complete your training missions." />
    <LessonProgress controller={controller} />
    <section className="lesson-mission-grid" aria-label="Algorithm lesson missions">{algorithms.map((a, index) => <article className={`panel lesson-card ${selected.id === a.id ? 'active' : ''}`} key={a.id}><div className="lesson-card-code"><CrewAvatar processId={index + 1} size={36} /><strong className="mono">{a.id}</strong><span className="badge">{algorithmLessons[a.id].difficulty}</span></div><h3>{a.name}</h3><p className="eyebrow">{a.group === 'non-preemptive' ? 'Non-preemptive' : 'Preemptive / Queue-based'}</p><p>{a.summary}</p><button className="button secondary small" aria-label={`Start Learning ${a.id}`} onClick={() => choose(a.id)}>{controller.progress.completedLessons.includes(a.id) ? 'Review lesson' : 'Start Learning'}</button></article>)}</section>
    <div className="academy-layout"><aside className="panel academy-nav" aria-label="Choose a scheduling algorithm"><h2>Algorithm library</h2>{algorithms.map(a => <button className={`learning-option ${a.id === selected.id ? 'selected' : ''}`} aria-label={`${a.id} ${a.name}`} aria-pressed={a.id === selected.id} key={a.id} onClick={() => choose(a.id)}><span className="mono">{a.id}</span><span>{a.name}</span></button>)}</aside><div className="academy-main" ref={workspace} role="region" aria-label="Lesson and quiz workspace" tabIndex={-1}><div className="training-actions academy-view-picker" aria-label="Academy section"><button className="button secondary" aria-pressed={tab === 'lessons'} onClick={() => setTab('lessons')}>Algorithm lessons</button><button className="button secondary" aria-pressed={tab === 'quiz'} onClick={() => setTab('quiz')}>Interactive quizzes</button></div>{tab === 'lessons' ? <AlgorithmLesson key={selected.id} algorithm={selected.id} completed={controller.progress.completedLessons.includes(selected.id)} onComplete={() => controller.completeLesson(selected.id)} onOpen={onOpen} /> : <AlgorithmQuiz key={selected.id} algorithm={selected.id} controller={controller} />}</div></div>
  </>
}




