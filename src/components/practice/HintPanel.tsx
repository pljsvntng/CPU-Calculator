import type { PracticeController } from '../../hooks/usePracticeMission'
import { practiceHints } from '../../utils/practiceHints'
export function HintPanel({ controller }: { controller: PracticeController }) {
  const hints = practiceHints(controller.problem!, controller.solution!)
  return <section className="panel training-panel" aria-label="Progressive hints"><div className="training-section-heading"><div><p className="eyebrow">GUIDED SUPPORT / {controller.hintLevel} OF 3</p><h2>Need a starting point?</h2></div><button className="button secondary" disabled={controller.hintLevel === 3} onClick={controller.hint}>REQUEST HINT</button></div><p>Hints carry no score penalty in study mode. The full solution stays closed until you submit an attempt and choose to review it.</p><ol className="hint-list">{hints.slice(0, controller.hintLevel).map((hint, i) => <li key={hint}><strong>Level {i + 1}</strong><p>{hint}</p></li>)}</ol></section>
}
