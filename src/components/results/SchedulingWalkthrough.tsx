import { SkipBack, SkipForward, RotateCcw, List } from 'lucide-react'
import type { SimulationPlayback } from '../../hooks/useSimulationPlayback'
import { displayNumber } from '../../utils/formatting'
export function SchedulingWalkthrough({ playback, eventCount, outdated, showAll, onShowAll }: { playback: SimulationPlayback; eventCount: number; outdated: boolean; showAll: boolean; onShowAll: () => void }) {
  return <section className="scheduling-walkthrough" aria-label="EXPLAIN MY SCHEDULE"><div><h3>EXPLAIN MY SCHEDULE</h3><p>The same playback session powers this walkthrough, the Gantt playhead and Mission Status.</p></div>
    <div className="walkthrough-controls"><button type="button" className="button secondary small" aria-label="Previous Explanation Step" disabled={outdated || playback.eventIndex < 0} onClick={playback.previous}><SkipBack size={14} />Previous Step</button><button type="button" className="button primary small" aria-label="Next Explanation Step" disabled={outdated || playback.eventIndex >= eventCount - 1} onClick={playback.next}>Next Step<SkipForward size={14} /></button><button type="button" className="button secondary small" disabled={outdated} onClick={() => playback.goToEvent(0)}><RotateCcw size={14} />Restart Explanation</button><button type="button" className="button secondary small" aria-pressed={showAll} onClick={onShowAll}><List size={14} />{showAll ? 'Hide All Steps' : 'Show All Steps'}</button></div>
    <p className="walkthrough-position mono">Time {displayNumber(playback.time)} · Event {playback.eventIndex + 1} / {eventCount}. Same-timestamp events retain their recorded sequence.</p>
  </section>
}
