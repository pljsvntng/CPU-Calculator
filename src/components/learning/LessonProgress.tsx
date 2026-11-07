import { useState } from 'react'
import { algorithms } from '../../data/algorithms'
import type { LearningProgressController } from '../../hooks/useLearningProgress'
import { learningAchievements } from '../../utils/learningProgress'

export function LessonProgress({ controller }: { controller: LearningProgressController }) {
  const { progress, warning } = controller, [confirm, setConfirm] = useState(false)
  return <section className="panel training-progress" aria-label="Learning progress"><div className="training-section-heading"><div><p className="eyebrow">LOCAL TRAINING RECORD</p><h2>Your academy progress</h2></div><button className="button secondary small" onClick={() => setConfirm(true)}>Reset Learning Progress</button></div>
    <div className="progress-stats"><div><strong>{progress.completedLessons.length}<small> / 8</small></strong><span>Lessons completed</span></div><div><strong>{progress.practiceTotal}</strong><span>Practice attempts</span></div><div><strong>{progress.quizCorrect}<small> / {progress.quizTotal}</small></strong><span>Quiz answers correct</span></div><div><strong>{progress.recentAlgorithm ?? '—'}</strong><span>Recently studied</span></div></div><progress value={progress.completedLessons.length} max={8} aria-label="Lessons completed" />
    {warning && <p role="status" className="training-notice">{warning}</p>}
    <details className="training-details"><summary>Best scores & optional crewmate achievements</summary><div className="best-scores">{algorithms.map(a => <span key={a.id}>{a.id} <strong>{progress.bestScores[a.id] === undefined ? 'No attempt' : `${progress.bestScores[a.id]!.toFixed(1)}%`}</strong></span>)}</div><ul className="achievement-list">{learningAchievements(progress).map(a => <li key={a.id}><span className={`badge ${a.earned ? 'blue' : ''}`}>{a.earned ? 'Earned' : 'Locked'}</span><div><strong>{a.name}</strong><p>{a.requirement}</p></div></li>)}</ul></details>
    <p className="source-note">Stored only in this browser. No account or external progress service. The latest 100 practice and 200 quiz attempts are retained; lifetime totals and best scores remain.</p>
    {confirm && <div className="training-confirm" role="alertdialog" aria-modal="false" aria-labelledby="reset-progress-title"><h3 id="reset-progress-title">Reset your learning record?</h3><p>This removes completed lessons, quiz and practice history, best scores and achievements from this browser.</p><div className="training-actions"><button className="button secondary" autoFocus onClick={() => setConfirm(false)}>Cancel reset</button><button className="button secondary" onClick={() => { controller.reset(); setConfirm(false) }}>Confirm reset</button></div></div>}
  </section>
}
